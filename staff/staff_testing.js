function OnInit()
{
	if ( external_test_id.HasValue && assigned_tests.ChildNum == 0 )
	{
		assignedTest = assigned_tests.AddChild();
		assignedTest.AssignElem( id.Parent );

		switch ( testing_state_id )
		{
			case 1:
				assignedTest.completion_id = 2;
				break;

			case 2:
				assignedTest.completion_id = 1;
				break;

			case 3:
				assignedTest.completion_id = 1;
				assignedTest.is_passed = false;
				break;

			case 4:
				assignedTest.completion_id = 1;
				assignedTest.is_passed = true;
				break;
		}

		external_test_id.Clear();
	}
}


function OnBeforeSave()
{
	if ( ChildExists( 'vacancy_id' ) && vacancy_id.HasValue )
		vacancy_org_id = vacancy_id.ForeignElem.org_id;

	if ( user_id.HasValue && ! group_id.HasValue )
		group_id = user_id.ForeignElem.main_group_id;

	contacts_desc = get_contacts_desc();

	update_state();

	is_active = ( occurrence_id == '' || occurrence_id == 'started' );
}


function OnBaseBuild()
{
	AssignElem( SrcObject, true );
	attachments.Clear();
}


function image_url()
{
	if ( is_active )
		return '//base_pict/testing.ico';
	else
		return '//base_pict/testing_inactive.ico';
}


function init()
{
	vacancy = vacancy_id.ForeignElem;

	if ( vacancy.testing_sample_id.HasValue )
		id.Parent.AssignElem( vacancy.testing_sample_id.ForeignElem );
}


function use_activation_code()
{
	//if ( ! AppModuleUsed( 'module_lukoil' ) )
		//return true;

	//return ( ArrayOptFind( assigned_tests, 'external_test_id.ForeignElem.testing_system_id.HasValue' ) != undefined );
	
	return ( ArrayOptFind( assigned_tests, 'activation_code.HasValue' ) != undefined );
}


function subject_desc()
{
	str = '';

	for ( assignedTest in assigned_tests )
	{
		if ( str != '' )
			str += ', ';

		str += assignedTest.external_test_id.ForeignDispName;

		if ( assignedTest.score.HasValue )
			str += '  (' + assignedTest.score + ')';
	}

	return str;
}


function update_state()
{
	if ( assigned_tests.ChildNum == 0 )
		return;

	eventType = GetForeignElem( event_types, 'testing' );

	if ( ArrayOptFind( assigned_tests, 'completion_id != 1' ) == undefined )
	{
		if ( eventType.has_occurrence( 'failed' ) && ArrayOptFind( assigned_tests, 'is_passed == false' ) != undefined )
			occurrence_id = 'failed';
		else
			occurrence_id = 'succeeded';
	}
	else if ( ArrayOptFind( assigned_tests, 'completion_id == 2' ) != undefined && GetForeignElem( event_types, 'testing' ).has_occurrence( 'started' ) )
		occurrence_id = 'started';
	else
		occurrence_id.Clear();

	start_date = ArrayMin( assigned_tests, 'start_date' ).start_date;
	
	if ( occurrence_id == 'succeeded' )
		end_date = ArrayMax( assigned_tests, 'end_date' ).end_date;
}


function handle_add_tests()
{
	testIDArray = lib_voc.select_voc_elems( external_tests );

	for ( testID in testIDArray )
	{
		assignedTest = assigned_tests.ObtainChildByKey( testID );
	}
	
	UpdateValues();
	Doc.SetChanged( true );
}


function handle_load_testing_sample()
{
	testingSampleID = lib_voc.select_voc_elem( testing_samples );
	testingSample = GetForeignElem( testing_samples, testingSampleID );

	id.Parent.AssignElem( testingSample );

	Doc.SetChanged( true );
}


function handle_register_candidate_in_testing_system()
{
	providersArray = ArraySelect( lib_voc.get_sorted_voc( recruit_providers ), 'features.outside_test_assignment' );
	if ( providersArray.length == 0 )
		return;
	else if ( providersArray.length == 1 )
		provider = providersArray[0];
	else
		provider = lib_base.select_elem( providersArray );

	lib_recruit_provider.HandleRegisterCandidateForSubsequentTesting( provider, this );
}


function activate()
{
	if ( assigned_tests.ChildNum == 0 )
		throw UserError( UiText.errors.external_tests_not_selected );

	for ( testingSystemID in ArraySelectDistinct( ArrayExtract( assigned_tests, 'external_test_id.ForeignElem.testing_system_id' ) ) )
	{
		if ( testingSystemID == null )
			continue;

		activate_tests( GetForeignElem( testing_systems, testingSystemID ), ArraySelect( assigned_tests, 'external_test_id.ForeignElem.testing_system_id == testingSystemID' ) );
	}
}


function activate_tests( testingSystem, assignedTestsArray )
{
	if ( testingSystem.recruit_provider_id.HasValue )
	{
		lib_recruit_provider.ActivateTesting( testingSystem, this, assignedTestsArray );
		return;
	}

	CallCodeUrlFunction( lib_testing.get_testing_system_script_url( testingSystem ), 'activate_testing', testingSystem, id.Parent, assignedTestsArray );
}


function update()
{
	if ( AppModuleUsed( 'module_sanofi' ) )
	{
		lib_ontarget.UpdateTestingState( this );
		return;
	}

	if ( assigned_tests.ChildNum == 0 )
		throw UserError( UiText.errors.external_tests_not_selected );

	for ( testingSystemID in ArraySelectDistinct( ArrayExtract( assigned_tests, 'external_test_id.ForeignElem.testing_system_id' ) ) )
	{
		if ( testingSystemID == null )
			continue;

		update_tests( GetForeignElem( testing_systems, testingSystemID ), ArraySelect( assigned_tests, 'external_test_id.ForeignElem.testing_system_id == testingSystemID' ) );
	}
}


function update_tests( testingSystem, assignedTestsArray )
{
	if ( testingSystem.recruit_provider_id.HasValue )
	{
		lib_recruit_provider.CheckTestingState( testingSystem, this, assignedTestsArray );
		return;
	}

	CallCodeUrlFunction( lib_testing.get_testing_system_script_url( testingSystem ), 'update_testing_state', testingSystem, id.Parent, assignedTestsArray );
	update_state();
}


function check_completion()
{
	testingDoc = OpenDoc( ObjectUrl );
	testingDoc.TopElem.update();
	if ( testingDoc.TopElem.EqualToElem( id.Parent ) )
		return;

	//prevCompletionID = completion_id;
	testingDoc.Save();
}


function was_activated()
{
	if ( AppModuleUsed( 'module_sanofi' ) )
		return true;

	return ( ArrayOptFind( assigned_tests, '! eid.HasValue' ) == undefined );
}


function get_ext_desc()
{
	str = '';

	for ( assigneTest in assigned_tests )
	{
		if ( str != '' )
			str += '\r\n';

		str += assigneTest.external_test_id.ForeignDispName;

		if ( assigneTest.score.HasValue || assigneTest.score_level_name.HasValue )
		{
			if ( AppModuleUsed( 'module_lukoil' ) )
			{
				str += ':  ' + assigneTest.score;

				if ( assigneTest.score.HasValue )
				{
					if ( assigneTest.max_score.HasValue )
						maxScore = assigneTest.max_score;
					else
						maxScore = assigneTest.external_test_id.ForeignElem.max_score;

					if ( maxScore != null )
						str += '/' + maxScore + '=' + assigneTest.score_percent + '%';
				}

				levelName = assigneTest.score_level_name;
				if ( levelName != '' )
					str += '  ' + levelName;
					
			}
			else
			{
				str += '  (' + assigneTest.score + ')';
			}
		}
		else if ( assigneTest.completion_id == 1 && AppModuleUsed( 'module_sanofi' ) )
		{
			str += '  (+)';
		}
	}

	return str;
}

