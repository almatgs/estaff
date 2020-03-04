function StartDocumentWorkflow( request )
{
	if ( CurAuthObject == undefined )
		throw UserError( 'Authorized user is not bound to a person' );

	if ( ! request.date.HasValue )
		request.date = CurDate;

	if ( ! request.cur_resp_person_id.HasValue )
		request.cur_resp_person_id = CurAuthObject.id;

	SendRequestNotifToPersonPrepare( request, request.cur_resp_person_id.ForeignElem );
	DoRequestAction( request, 'submit' );
}


function DoRequestAction( request, actionID, actionData )
{
	if ( request.state_id == 'draft' || actionID == 'resubmit' || actionID == 'cancel' )
	{
		if ( CurAuthObject == undefined || request.orig_person_id != CurAuthObject.id )
			throw UserError( 'Permission denied for the current person' );
	}
	else
	{
		if ( CurAuthObject == undefined || request.cur_resp_person_id != CurAuthObject.id )
			throw UserError( 'Permission denied for the current person' );
	}

	if ( actionID == 'resubmit' )
	{
		request.cur_resp_person_id = request.orig_person_id;
		request.workflow_stage_id.Clear();
	}

	switch ( actionID )
	{
		case 'submit':
		case 'approve':
		case 'resubmit':
			DoRequestActionApprove( request, actionID, actionData );
			break;

		case 'reject':
			DoRequestActionReject( request, actionID, actionData );
			break;

		case 'return_to_orig_person':
			DoRequestActionReturnToOrigPerson( request, actionID, actionData );
			break;

		case 'cancel':
			DoRequestActionCancel( request, actionID, actionData );
			break;

		default:
			throw UserError( 'Invalid request action: ' + actionID );
	}
}


function DoRequestActionApprove( request, actionID, actionData )
{
	workflowType = request.workflow_type_id.OptForeignElem;
	if ( workflowType == undefined )
		throw UserError( 'Unknown workflow type: "' ) + request.workflow_type_id + '"';

	workflowStage = request.workflow_stage_id.OptForeignElem;
	nextPerson = undefined;
	nextStateID = undefined;

	if ( workflowStage == undefined )
	{
		if ( workflowType.stages.ChildNum == 0 )
			throw UserError( 'No workflow stages defined' );

		workflowStage = workflowType.stages[0];
		moveNext = false;
	}
	else
	{
		moveNext = true;
	}

	if ( workflowStage.resp_person.type_id == 'cur_resp_person_direct_supervisor' && workflowStage.resp_person.repeat_while_exists )
	{
		if ( lib_struct.GetOptPersonDirectSupervisor( request.cur_resp_person_id ) != undefined )
			moveNext = false;
		else
			moveNext = true;
	}

	if ( moveNext )
	{
		childIndex = workflowStage.ChildIndex;
		if ( childIndex + 1 >= workflowType.stages.ChildNum )
		{
			FinishRequest( request, actionID, actionData );
			return;
		}

		nextWorkflowStage = workflowType.stages[childIndex + 1];
	}
	else
	{
		nextWorkflowStage = workflowStage;
	}

	if ( nextWorkflowStage.resp_person.type_id == 'orig_person_direct_supervisor' )
	{
		nextPerson = lib_struct.GetPersonDirectSupervisor( request.orig_person_id );
	}
	else if ( nextWorkflowStage.resp_person.type_id == 'cur_resp_person_direct_supervisor' )
	{
		nextPerson = lib_struct.GetPersonDirectSupervisor( request.cur_resp_person_id );
	}
	else if ( nextWorkflowStage.resp_person.type_id == 'division_head' )
	{
		if ( ! request.division_id.HasValue )
			throw UserError( 'Division is not specified' );

		if ( nextWorkflowStage.resp_person.division_type_id.HasValue )
		{
			division = lib_struct.GetUpperDivisionWithType( request.division_id, nextWorkflowStage.resp_person.division_type_id );
			nextPerson = lib_struct.GetDivisionHead( division.id );
		}
		else
		{
			throw UserError( 'Required division type is not specified in workflow' );
		}
	}
	else if ( nextWorkflowStage.resp_person.type_id == 'upper_person_with_role' )
	{
		if ( ! request.division_id.HasValue )
			throw UserError( 'Division is not specified' );

		if ( ! nextWorkflowStage.resp_person.person_struct_role_type_id.HasValue )
			throw UserError( 'Person role is not specified' );

		nextPerson = lib_struct.GetDivisionPersonWithRoleRec( request.division_id, nextWorkflowStage.resp_person.person_struct_role_type_id );
	}
	else if ( nextWorkflowStage.resp_person.type_id == 'fixed_person' )
	{
		if ( ! nextWorkflowStage.resp_person.person_id.HasValue )
			throw UserError( 'Fixed employee is not specified' );

		nextPerson = nextWorkflowStage.resp_person.person_id.ForeignElem;
	}
	else
	{
		throw UserError( 'Unknown workflow person type: "' ) + nextWorkflowStage.resp_person.type_id + '"';
	}

	origPerson = request.orig_person_id.ForeignElem;

	email = SendRequestNotifToPersonPrepare( request, nextPerson );
	email2 = SendRequestNotifToPersonPrepare( request, origPerson );

	SetRequestWorkflowStage( request, actionID, actionData, nextWorkflowStage, nextPerson.id, nextStateID );
	request.Doc.Save();

	SetRequestNotifToPersonCore( request, 'notify_resp_person_on_workflow_document', nextPerson, email );
	
	if ( actionID != 'submit' && actionID != 'resubmit' )
		SetRequestNotifToPersonCore( request, 'notify_orig_person_on_workflow_document_state', origPerson, email2 );
}


function DoRequestActionReject( request, actionID, actionData )
{
	nextPerson = request.orig_person_id.ForeignElem;
	email = SendRequestNotifToPersonPrepare( request, nextPerson );

	SetRequestWorkflowStage( request, actionID, actionData, undefined, nextPerson.id, 'rejected' );
	request.Doc.Save();

	SetRequestNotifToPersonCore( request, 'notify_orig_person_on_workflow_document_state', nextPerson, email );
}


function DoRequestActionReturnToOrigPerson( request, actionID, actionData )
{
	nextPerson = request.orig_person_id.ForeignElem;
	email = SendRequestNotifToPersonPrepare( request, nextPerson );

	SetRequestWorkflowStage( request, actionID, actionData, undefined, nextPerson.id, 'returned' );
	request.Doc.Save();

	SetRequestNotifToPersonCore( request, 'notify_orig_person_on_workflow_document_state', nextPerson, email );
}


function DoRequestActionCancel( request, actionID, actionData )
{
	nextPerson = request.cur_resp_person_id.ForeignElem;
	email = SendRequestNotifToPersonPrepare( request, nextPerson );

	SetRequestWorkflowStage( request, actionID, actionData, undefined, request.orig_person_id, 'cancelled' );
	request.Doc.Save();

	SetRequestNotifToPersonCore( request, 'notify_resp_person_on_workflow_document_cancel', nextPerson, email );
}


function FinishRequest( request, actionID, actionData )
{
	nextPerson = request.orig_person_id.ForeignElem;
	email = SendRequestNotifToPersonPrepare( request, nextPerson );

	SetRequestWorkflowStage( request, actionID, actionData, undefined, undefined, 'finished' );
	
	if ( request.Name == 'vacancy_request' )
		lib_recruit_hm_core.FinishVacancyRequest( request );

	request.Doc.Save();
	SetRequestNotifToPersonCore( request, 'notify_orig_person_on_workflow_document_state', nextPerson, email );
}


function SetRequestWorkflowStage( request, actionID, actionData, nextWorkflowStage, newRespPersonID, nextStateID )
{
	startDate = CurDate;

	if ( request.stage_records.ChildNum != 0 )
	{
		prevRecord = request.stage_records[request.stage_records.ChildNum - 1];
		prevRecord.end_date = startDate;

		if ( actionID != undefined )
			prevRecord.action_id = actionID;

		if ( actionData != undefined && actionData.HasProperty( 'comment' ) )
			prevRecord.comment = actionData.comment;
	}

	if ( nextWorkflowStage != undefined )
	{
		record = request.stage_records.AddChild();
		record.start_date = startDate;
		record.workflow_stage_id = nextWorkflowStage.id;
		record.resp_person_id = newRespPersonID;
	}

	if ( nextStateID == undefined )
		request.state_id = 'active';
	else
		request.state_id = nextStateID;

	if ( nextWorkflowStage != undefined )
	{
		request.workflow_stage_id = nextWorkflowStage.id;
		request.cur_resp_person_id = newRespPersonID;
	}
	else
	{
		request.workflow_stage_id.Clear();
		request.cur_resp_person_id.Clear();
	}
}


function SetRequestNotifToPersonCore( request, mailTemplateID, destPerson, email )
{
	otherEnv = new Object;
	otherEnv.request = request;

	//if ( vacancy != undefined )
		//otherEnv.vacancy = vacancy;

	/*if ( otherEnv2 != undefined )
	{
		for ( propName in otherEnv2 )
			otherEnv.SetProperty( propName, otherEnv2.GetProperty( propName ) );
	}*/

	/*if ( mailTemplateID == undefined )
	{
		mailTemplateID = 'notify_resp_person_on_workflow_document';
	}*/

	message = lib_mail.build_mail_message( GetForeignElem( mail_templates, mailTemplateID ), email, destPerson, otherEnv );

	/*message = new MailMessage();
	message.recipients.AddChild().address = email;
		
	if ( destPerson.id == request.cur_resp_person_id )
	{
		message.subject = UiText.titles.request_to_approve;
		message.body = UiText.notify_resp_person_on_workflow_document.body_footer + '\r\n' + request.web_link;
	}
	else
	{
		message.subject = UiText.notify_resp_person_on_workflow_document.subject;

		message.body += UiText.fields.state + ': ' + request.state_id.ForeignDispName + '\r\n';
		if ( request.workflow_stage_id.HasValue )
			message.body += UiText.fields.workflow_stage + ': ' + request.workflow_stage_id.ForeignDispName + '\r\n';
		message.body += UiText.fields.link + ': ' + request.web_link + '\r\n';
	}
		
	message.subject += ' (' + request.code + ')';*/

	lib_mail.send_mail_message( message );
}


function SendRequestNotifToPersonPrepare( request, destPerson )
{
	if ( ( email = AppConfig.GetOptProperty( 'subst-notif-email' ) ) != undefined )
	{
	}
	else
	{
		if ( ! destPerson.email.HasValue )
		{
			//if ( otherEnv2 != undefined && otherEnv2.err != undefined )
				throw UiError( 'Не указан email для сотрудника ' + destPerson.fullname );

			//HandleWorkflowError( 'Не указан email для сотрудника ' + destPerson.fullname, request );
		}

		email = destPerson.email;
	}

	return email;
}


/*function BuildDefaultNotifTemplate()
{
	template = CreateElem( '//base1/base1_mail_template.xmd', 'mail_template' );
	template.subject = UiText.notify_resp_person_on_workflow_document.subject;
	template.text = UiText.notify_resp_person_on_workflow_document.body + '\r\n' + '<%=request.web_link%>';
	template.is_notif = true;
	return template;
}*/


function WorkflowError( desc )
{
	return BmUiError( UiText.titles.workflow_error + ':\r\n' + desc );
}
