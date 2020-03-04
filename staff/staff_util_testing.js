function load_external_tests( testingSystem )
{
	reqObject = new Object;
	reqObject.command = 'get_all_assessments';

	resp = run_request( testingSystem, reqObject );

	srcDoc = OpenDocFromStr( resp.Body, 'form=//staff/portal/portal_assessments.xmd' );
	
	for ( srcElem in srcDoc.TopElem )
	{
		newExternalTest = GetFailedForeignElem( external_tests );
		newExternalTest.id = testingSystem.id + ':' + srcElem.eid;
		newExternalTest.name = srcElem.code + '  ' + srcElem.name;
		newExternalTest.testing_system_id = testingSystem.id;
		
		lib_voc.init_voc_std_elem( external_tests, newExternalTest );
	}
}


function activate_testing( testingSystem, testing, assignedTestsArray )
{
	candidate = testing.candidate_id.ForeignElem;

	collaboratorDoc = OpenNewDoc( '//staff/portal/portal_collaborator.xmd' );
	collaboratorDoc.TopElem.AssignElem( candidate );
	collaboratorDoc.TopElem.eid = StrHexInt( candidate.id, 16 );

	reqObject = new Object;
	reqObject.command = 'register_collaborator';
	reqObject.collaborator_data = collaboratorDoc.TopElem.Xml;

	resp = run_request( testingSystem, reqObject );

	for ( asignedTest in assignedTestsArray )
	{
		externalTest = asignedTest.external_test_id.ForeignElem;

		reqObject = new Object;
		reqObject.command = 'activate_assessment';
		reqObject.candidate_eid = collaboratorDoc.TopElem.eid;
		reqObject.assessment_eid = StrScan( asignedTest.external_test_id, '%*s:%s' )[0];

		resp = run_request( testingSystem, reqObject );

		srcDoc = OpenDocFromStr( resp.Body, 'form=//staff/portal/portal_active_test_learning.xmd' );
		asignedTest.eid = srcDoc.TopElem.eid;
		asignedTest.activation_code = srcDoc.TopElem.code;
		asignedTest.url = srcDoc.TopElem.url;
		asignedTest.completion_id.Clear();
	}
}


function update_testing_state( testingSystem, testing, assignedTestsArray )
{
	var		asignedTest;

	for ( asignedTest in assignedTestsArray )
	{
		externalTest = asignedTest.external_test_id.ForeignElem;

		reqObject = new Object;
		reqObject.command = 'get_active_test_learning';
		reqObject.active_test_learning_eid = asignedTest.eid;

		resp = run_request( testingSystem, reqObject );

		srcDoc = OpenDocFromStr( resp.Body, 'form=//staff/portal/portal_active_test_learning.xmd' );

		switch ( srcDoc.TopElem.state_id )
		{
			case 1:
			case 2:
				asignedTest.completion_id = 2;
				break;

			case 3:
			case 4:
				asignedTest.completion_id = 1;
				break;
		}

		if ( asignedTest.completion_id.HasValue && srcDoc.TopElem.start_usage_date != null )
			asignedTest.start_date = srcDoc.TopElem.start_usage_date;

		if ( asignedTest.completion_id == 1 && srcDoc.TopElem.start_usage_date != null )
			asignedTest.end_date = srcDoc.TopElem.last_usage_date;

		asignedTest.score = srcDoc.TopElem.score;
		
		if ( srcDoc.TopElem.url.HasValue )
			asignedTest.url = srcDoc.TopElem.url;
	}
}


function run_request( testingSystem, reqObject )
{
	if ( testingSystem.address == '' )
		throw UserError( '¬заимодействие с внешней системой тестировани€ ' + testingSystem.name + ' не настроено. Ќе указан адрес сервера.' );

	reqObject.login = 'estaff';

	//alert( MultipartFormEncode( reqObject ) );

	resp = HttpRequest( 'http://' + testingSystem.address + '/estaff_api.html', 'post', undefined, MultipartFormEncode( reqObject ) );
	PutUrlData( 'zz_resp.xml', resp.Body );
	return resp;
}




