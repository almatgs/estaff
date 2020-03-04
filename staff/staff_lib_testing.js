function load_all_external_tests()
{
	array = lib_voc.get_sorted_voc( testing_systems );
	switch ( ArrayCount( array ) )
	{
		case 0:
			throw UserError( UiText.errors.no_testing_systems_specified );

		case 1:
			break;

		case 2:
			array = ArrayExtract( lib_voc.select_voc_elems( testing_systems ), 'GetForeignElem( testing_systems, This )' );
			break;
	}

	for ( testingSystem in array )
	{
		load_external_tests( testingSystem );
	}
}


function load_external_tests( testingSystem )
{
	if ( testingSystem.recruit_provider_id.HasValue )
	{
		lib_recruit_provider.LoadExternalTests( testingSystem.recruit_provider_id.ForeignElem, testingSystem );
		return;
	}

	CallCodeUrlFunction( get_testing_system_script_url( testingSystem ), 'load_external_tests', testingSystem );
}


function get_testing_system_script_url( testingSystem )
{
	if ( testingSystem.id == 'talentq' )
		return 'staff_util_testing_talentq.js';

	if ( ( obj = StrOptScan( testingSystem.id, 'talentq_%s' ) ) != undefined )
		return 'x-app://module_' + obj[0] + '/' + obj[0] + '_util_testing_talentq.js';

	if ( testingSystem.use_own_site )
		return 'staff_util_testing_v2.js';

	return 'staff_util_testing.js';
}


function build_assigned_test_url( assignedTest )
{
	if ( IsAbsoluteUrlStr( assignedTest.url ) )
		return assignedTest.url;

	testingSystem = assignedTest.external_test_id.ForeignElem.testing_system_id.ForeignElem;

	if ( testingSystem.use_own_site )
		baseAddress = testingSystem.own_site_id.ForeignElem.std_interface.address;
	else
		baseAddress = testingSystem.address;

	if ( ! StrBegins( assignedTest.url, '/' ) )
		baseAddress += '/';

	return 'http://' + baseAddress + assignedTest.url;
}


function check_testings()
{
	array = XQuery( 'for $elem in testings where $elem/date >= ' + XQueryLiteral( DateOffset( DateNewTime( CurDate ), 0 - 30 * 86400 ) ) + ' and $elem/is_active = true() return $elem' );

	for ( testing in ArraySelectAll( array ) )
	{
		if ( ! testing.was_activated || testing.assigned_tests.ChildNum == 0 )
			continue;

		testing.check_completion();
	}
}


function get_candidate_active_testing( candidateID )
{
	return ArrayOptMax( get_candidate_active_testings( candidateID ), 'date' );
}


function get_candidate_active_testings( candidateID )
{
	array = lib_base.query_records_by_key( testings, candidateID, 'candidate_id' );
	//array = ArraySelect( array, 'is_active' );
	return array;
}
