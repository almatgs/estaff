function CheckProvider(provider, account)
{
	soapXml = create_soap_xml('getApiVersionNumber');
	soapResp = CallApiMethod(provider, soapXml);
}

function CheckAccount(provider, account)
{
}

function GetTests(provider, account)
{
	soapXml = create_soap_xml('getTestsCount');
	soapResp = CallApiMethod(provider, soapXml);
	testsCount = Int(soapResp.TestsCount);

	testList = new Array;

	for (i = 0; i < testsCount; i++) {

		test_name = get_test_name(provider, i);
		syst_name = get_test_system_name(provider, i);

		testList.push({ "id": syst_name, "name": test_name });
	}

	return testList;
}

function RegisterPerson(provider, account, person)
{
	return { eid: person.id };
}

function AssignTestToPerson(provider, account, personEid, person, externalTestEid, testing)
{
	externalSessionGuid = UniqueID();
	test_name = externalTestEid;

	soapXml = create_soap_xml('createTestingSession', [{ "name": "TestName", "value": test_name }, { "name": "ExternalSessionGuid ", "value": externalSessionGuid }]);
	soapResp = CallApiMethod(provider, soapXml);
	PutUrlData('zz_createTestingSession.xml', soapResp.Xml);

	params = [];
	params.push({ "name": "ExternalSessionGuid", "value": externalSessionGuid });
	params.push({ "name": "RespondentLastName", "value": person.lastname });
	params.push({ "name": "RespondentFirstName", "value": person.firstname });
	params.push({ "name": "RespondentMiddleName", "value": person.middlename });
	params.push({ "name": "RespondentShortName", "value": person.fullname });
	params.push({ "name": "RespondentBirthDate", "value": person.birth_date });
	params.push({ "name": "RespondentAge", "value": person.age });
	params.push({ "name": "RespondentGender", "value": person.gender_id == 0 ? 'm' : 'f' });
	params.push({ "name": "RespondentEmail", "value": person.email });
	params.push({ "name": "RespondentPhone", "value": person.mobile_phone });

	soapXml = create_soap_xml('setSessionRespondent', params);
	soapResp = CallApiMethod(provider, soapXml);

	soapXml = create_soap_xml('getTestingSessionUrl', [{ "name": "ExternalSessionGuid ", "value": externalSessionGuid }]);
	soapResp = CallApiMethod(provider, soapXml);

	destObj = new Object;
	destObj.assigned_test_eid = externalSessionGuid;
	destObj.start_url = soapResp.TestingSessionUrl;

	return destObj;
}

function CheckTestingState(provider, account, assignedTestEid, personEid, externalTestEid)
{
	stateInfo = { 'completion_id': null, 'result_url': "", 'assigned_test_eid': assignedTestEid };
	soapXml = create_soap_xml('isTestingSessionComplete', [{ "name": "ExternalSessionGuid ", "value": assignedTestEid }]);
	soapResp = CallApiMethod(provider, soapXml);

	if (soapResp.IsSessionComplete == 'true') {

		soapResp = getResultsReportUrl(provider, assignedTestEid);
		stateInfo.completion_id = 1;
		stateInfo.result_url = soapResp.ResultsReportUrl;
	}
	return stateInfo;
}

function RunCheckStatesTask(provider, account)
{
	LogEvent('maintest', 'Started checking for changed statuses');
	testingsArray = XQuery('for $elem in testings return $elem');

	destArray = new Array;

	for (testing in testingsArray) {

		if (!testing.is_active)
			continue;

		for (assigned_test in testing.assigned_tests) {

			if (assigned_test.completion_id != 1 && StrContains(assigned_test.external_test_id, provider.id)) {

				stateInfo = CheckTestingState(provider, account, assigned_test.eid, testing.person_eid, assigned_test.eid);
				destArray.push(stateInfo);
			}
		}
	}
	if (ArrayCount(destArray) > 0)
		lib_recruit_provider.OnProviderUpdateTestingStates(provider, destArray);

	LogEvent('maintest', 'Finished checking for changed statuses');

}


function CallApiMethod(provider, soapXml)
{
	lib_imod.CheckImod();

	targetUrl = 'https://test.ht-line.ru/maintest-5i/api/1.9.0.0/';
	auth = 'Authorization: Basic ' + Base64Encode(provider.login + ':' + StrStdDecrypt(provider.password_ed)) + '\r\n';
	resp = HttpRequest(targetUrl, 'post', soapXml, auth);
	//PutUrlData('zz_resp.xml', resp.Body);

	respDoc = OpenDocFromStr(resp.Body, 'drop-namespaces=1');

	if (respDoc.TopElem.Name != 'Envelope')
		throw 'Invalid SOAP response';

	soapResp = respDoc.Envelope.Body.Child(0);
	operationStatus = soapResp.OperationStatus;

	if (!(operationStatus.ErrorNumber == '0' && operationStatus.ErrorCode == 'OK')) {
		PutUrlData('zz_err.xml', soapResp.Xml);
		throw UserError(operationStatus.ErrorMessage);
	}
	return soapResp;
}

function create_soap_xml(method, params)
{
	soap = OpenDocFromStr('<soap:Envelope></soap:Envelope>').TopElem;
	soap.AddAttr('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
	soap.AddAttr('xmlns:xsd', 'http://www.w3.org/2001/XMLSchema');
	soap.AddAttr('xmlns:soap', 'http://schemas.xmlsoap.org/soap/envelope/');
	header = soap.AddChild('soap:Header');
	body = soap.AddChild('soap:Body');
	coreElem = body.AddChild(method);

	if (params != undefined) {
		for (param in params) {
			coreElem.AddChild(param.name, 'string').Value = param.value;
		}
	}
	xml = '<?xml version="1.0" encoding="utf-8"?>\r\n' + EncodeCharset(soap.Xml, 'utf-8');

	return xml;
}



function isTestingSessionComplete(provider, ExternalSessionGuid)
{
	soapXml = create_soap_xml('isTestingSessionComplete', [{ "name": "ExternalSessionGuid", "value": ExternalSessionGuid }]);
	soapResp = CallApiMethod(provider, soapXml);

	return soapResp.IsSessionComplete;
}

function getResultsReportXml(provider, ExternalSessionGuid)
{
	params = [
		{ "name": "ExternalSessionGuid", "value": ExternalSessionGuid },
		{ "name": "ReportVariantId", "value": 0 },
		{ "name": "HtmlProcessMode", "value": 0 },
		{ "name": "Base64Encoded", "value": 0 }
	];
	soapXml = create_soap_xml('getResultsReportXml', params);
	soapResp = CallApiMethod(provider, soapXml);

	return soapResp;
}

function getResultsReportUrl(provider, ExternalSessionGuid)
{
	params = [{ "name": "ExternalSessionGuid", "value": ExternalSessionGuid }];
	soapXml = create_soap_xml('getResultsReportUrl', params);
	soapResp = CallApiMethod(provider, soapXml);

	return soapResp;
}

function get_test_system_name(provider, test_id)
{
	soapXml = create_soap_xml('getTestName', [{ "name": "TestIndex", "value": test_id }]);
	soapResp = CallApiMethod(provider, soapXml);

	return soapResp.TestName;
}

function get_test_name(provider, test_id)
{
	soapXml = create_soap_xml('getTestAttribs', [{ "name": "TestIndex", "value": test_id }]);
	soapResp = CallApiMethod(provider, soapXml);

	return soapResp.TestAttribs.TestTitle;
}


