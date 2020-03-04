"META:ALLOW-CALL-FROM-CLIENT:1";
function SubmitCandidateEventResultCore( candidateID, eventUrl, resultData )
{
	//candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
	//candidate = candidateDoc.TopElem;
	
	eventDoc = OpenDoc( eventUrl );
	event = eventDoc.TopElem;
	event.occurrence_id = resultData.occurrence_id;
	event.comment = resultData.comment;

	eventDoc.Save();

	//candidate.update_state();
	//candidateDoc.Save();
	lib_candidate.OnEventOccurrenceChange( event );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function AddCandidateCommentCore( candidateID, eventData )
{
	candidateDoc = DefaultDb.OpenObjectDoc( 'candidate', candidateID );
	candidate = candidateDoc.TopElem;

	eventDoc = DefaultDb.OpenNewObjectDoc( 'event' );
	event = eventDoc.TopElem;
	event.date = CurDate;
	event.type_id = 'comment';
	event.candidate_id = candidateID;
	event.author_id = CurAuthObject.id;
	event.comment = eventData.comment;
	event.vacancy_id = eventData.vacancy_id;

	eventDoc.Save();

	candidate.update_state();
	candidateDoc.Save();
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function DoVacancyRequestActionCore( vacancyRequestID, actionID, actionData )
{
	requestUrl = ObjectDocUrl( 'data', 'vacancy_request', vacancyRequestID );

	requestDoc = OpenDoc( requestUrl );
	request = requestDoc.TopElem;

	if ( actionID == 'submit' || actionID == 'resubmit' )
	{
		workflowType = GetVacancyRequestWorkflowType( request );
		if ( workflowType != undefined )
		{
			request.workflow_type_id = workflowType.id;

			if ( actionID == 'submit' )
				lib_workflow.StartDocumentWorkflow( request );
			else
				lib_workflow.DoRequestAction( request, actionID, actionData );
		}
		else
		{
			vacancy = FinishVacancyRequest( requestDoc.TopElem );

			request.vacancy_id = vacancy.id;
			request.state_id = 'finished';
			request.workflow_stage_id.Clear();
			request.cur_resp_person_id.Clear();
			requestDoc.Save();
		}
	}
	else
	{
		lib_workflow.DoRequestAction( request, actionID, actionData );
	}
}


function GetVacancyRequestWorkflowType( vacancyRequest )
{
	for ( workflow in global_settings.hm_recruit.vacancy_request_workflows )
	{
		if ( ! workflow.workflow_type_id.HasValue || ! workflow.exist_req_expr.HasValue )
			continue;

		envObject = new Object;
		envObject.vacancy_request = vacancyRequest;

		try
		{
			//match = SafeEval( workflow.exist_req_expr, [envObject, vacancyRequest] );

			with ( vacancyRequest )
			{
				match = eval( workflow.exist_req_expr, [envObject, vacancyRequest] );
			}
		}
		catch ( e )
		{
			throw UserError( UiText.errors.eval_exist_req_expr_failed + '\r\n', e );
		}

		if ( match )
			return GetForeignElem( workflow_types, workflow.workflow_type_id );
	}

	if ( global_settings.hm_recruit.default_vacancy_request_workflow_type_id.HasValue )
		return global_settings.hm_recruit.default_vacancy_request_workflow_type_id.ForeignElem;

	if (!global_settings.hm_recruit.skip_nonexistent_workflow && global_settings.hm_recruit.vacancy_request_workflows.ChildNum != 0 )
		throw UiError( UiText.errors.matching_workflow_type_not_found );

	return undefined;
}


function FinishVacancyRequest( vacancyRequest )
{
	vacancyDoc = DefaultDb.OpenNewObjectDoc( 'vacancy' );
	vacancy = vacancyDoc.TopElem;

	for ( srcElem in vacancyRequest )
	{
		switch ( srcElem.Name )
		{
			case 'date':
				continue;
		}

		if ( srcElem.FormElem.IsMultiple )
		{
			formElem = vacancy.FormElem.OptChild( srcElem.Name );
			if ( formElem == undefined )
				continue;

			multiElem = GetObjectProperty( vacancy, srcElem.Name );
			destElem = multiElem.Add();
			destElem.AssignElem( srcElem );
		}
		else
		{
			destElem = vacancy.OptChild( srcElem.Name );
			if ( destElem == undefined )
				destElem = vacancy.req_info.OptChild( srcElem.Name );
			if ( destElem == undefined || destElem.HasValue )
				continue;

			destElem.AssignElem( srcElem );
		}
	}

	//vacancy.name = vacancyRequest.profession_id.ForeignElem.name;

	vacancy.rr_persons.ObtainChildByKey( vacancyRequest.orig_person_id );

	if ( vacancyRequest.req_quantity >= 2 )
	{
		vacancy.is_mp_vacancy = true;

		instance = vacancy.instances.AddChild();
		instance.id = UniqueID();
		instance.start_date = vacancy.start_date;
		instance.req_quantity = vacancyRequest.req_quantity;
	}

	if ( vacancyRequest.vacancy_desc.HasValue )
	{
		attachment = vacancy.attachments.ObtainChildByKey( 'vacancy_desc', 'type_id' );
		attachment.content_type = 'text/html';
		attachment.text = HtmlEncode( vacancyRequest.vacancy_desc );
	}


	vacancy.user_id = vacancyRequest.resp_user_id;
	
	/*if ( vacancyRequest.max_work_term.length.HasValue )
	{
		vacancy.max_work_term.AssignElem( vacancyRequest.max_work_term );
		vacancy.update_req_close_date_by_max_work_term();
	}
	
	if ( vacancyRequest.req_hire_date.HasValue && vacancyRequest.req_hire_date > vacancy.req_close_date )
	{
		vacancy.req_close_date = vacancyRequest.req_hire_date;
		vacancy.update_max_work_term_by_req_close_date();
	}*/

	lib_staff_connector.InitNewVacancyData( vacancy );

	lib_vacancy.InitLoadedVacancy( vacancy );
	vacancyDoc.Save();

	if ( vacancy.user_id.HasValue )
		lib_recruit.create_loaded_vacancy_notif( vacancy );

	return vacancy;
}
