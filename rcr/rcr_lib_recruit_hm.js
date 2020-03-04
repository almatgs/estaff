function GetRrPersonFocusVacancyIDs( personID )
{
	queryStr = 'for $elem in vacancies';
	queryStr += ' where MatchSome( $elem/rr_persons/rr_person/person_id, (' + XQueryLiteral( personID ) + ') )'
	queryStr += ' and ( $elem/is_active = true() or $elem/state_date >= ' + XQueryLiteral( DateOffset( CurDate, 0 - 30 * 86400 ) ) + ' )'
	queryStr += ' return $elem/Fields( \'id\' )';

	return ArrayExtract( XQuery( queryStr ), 'id' );
}


function GetRrPersonAllowedCandidateStateIDs()
{
	//if ( ! global_settings.hm_recruit.restrict_shown_candidates )
		//return undefined;

	return ArrayExtract( ArraySelect( lib_voc.get_sorted_voc( candidate_states ), 'show_object_on_portal' ), 'id' );
}


function GetRrPersonToDoCandidateStateIDs()
{
	return ArrayExtract( ArraySelect( lib_voc.get_sorted_voc( candidate_states ), 'is_rr_duty_portal_state' ), 'id' );
}


function GetCandidateEvents( candidate )
{
	return candidate.get_ui_events_array();
}


function HandleSubmitCandidateEventResult( candidate, event, resultData )
{
	if ( resultData.occurrence_id == '')
		throw UiError( UiText.errors.action_not_specified );
	
	occurrence = event.type.get_occurrence( resultData.occurrence_id );
	lib_event.check_event_comment( resultData, occurrence );

	CallServerMethod( 'lib_recruit_hm_core', 'SubmitCandidateEventResultCore', [candidate.id, event.PrimaryObjectUrl, resultData] );
	
	DropXQueryCache( event.ObjectUrl );
	if ( candidate.Doc.OptScreen != undefined )
		ui_client.ReloadObjectPreviewScreen( candidate.Doc.Screen );
}


function HandleAddCandidateComment( candidate )
{
	dlgDoc = OpenDoc( '//rcr3/rcr3_dlg_comment.xml' );
	ActiveScreen.ModalDlg( dlgDoc );
	
	eventData = new Object;
	eventData.comment = RValue( dlgDoc.TopElem.comment );
	eventData.vacancy_id = RValue( GetCandidateTargetVacancyID( candidate ) );

	CallServerMethod( 'lib_recruit_hm_core', 'AddCandidateCommentCore', [candidate.id, eventData] );
	
	DropXQueryCache( candidate.ObjectUrl );
	ui_client.ReloadObjectPreviewScreen( candidate.Doc.Screen );
}


function GetCandidateTargetVacancyID( candidate )
{
	//if ( ( targetSpot = get_opt_sel_spot() ) != undefined )
		//return targetSpot.vacancy_id;

	array = candidate.active_spots();

	if ( ArrayCount( array ) > 1 )
		array = ArraySelect( array, 'This.vacancy_id.ForeignElem.rr_persons.ChildByKeyExists( LdsCurUserID )' );
	
	switch ( ArrayCount( array ) )
	{
		case 0:
			return null;

		case 1:
			return array[0].vacancy_id;

		default:
			//if ( global_settings.require_spot_selection )
				//throw UiError( UiText.errors.spot_not_selected );

			return ArrayFirstElem( ArraySort( array, 'state_date', '-' ) ).vacancy_id;
	}

	return null;
}




function IsVacancyRequestFieldEditable( vacancyRequest, field )
{
	if ( field.FormElem.GetBoolAttr( 'workflowCore' ) )
		return false;

	if ( vacancyRequest.view.is_resubmit || vacancyRequest.state_id == 'returned' )
		return true;

	if ( vacancyRequest.state_id == 'finished' )
		return false;

	if ( vacancyRequest.state_id == 'draft' )
	{
		if ( vacancyRequest.orig_person_id != LdsCurUserID )
			return false;
	}
	else
	{
		if ( vacancyRequest.cur_resp_person_id != LdsCurUserID )
			return false;
	}

	return true;
}


function AllowVacancyRequestAction( vacancyRequest, actionID )
{
	if ( actionID == 'submit' )
	{
		if ( vacancyRequest.state_id != 'draft' && vacancyRequest.state_id != 'returned' )
			return false;

		if ( vacancyRequest.orig_person_id != LdsCurUserID )
			return false;
	}
	else if ( actionID == 'resubmit' )
	{
		if ( ! vacancyRequest.workflow_type_id.ForeignElem.allow_resubmit )
			return false;

		if ( vacancyRequest.state_id != 'active' )
			return false;

		if ( vacancyRequest.orig_person_id != LdsCurUserID )
			return false;
	}
	else if ( actionID == 'cancel' )
	{
		if ( vacancyRequest.state_id != 'active' )
			return false;

		if ( vacancyRequest.orig_person_id != LdsCurUserID )
			return false;
	}
	else if ( actionID == 'return_to_orig_person' )
	{
		if ( vacancyRequest.state_id != 'active' )
			return false;

		stage = vacancyRequest.workflow_stage_id.OptForeignElem;
		if ( stage == undefined || ! stage.allow_return_to_orig_person )
			return false;

		if ( vacancyRequest.cur_resp_person_id != LdsCurUserID )
			return false;
	}
	else
	{
		if ( vacancyRequest.state_id != 'active' )
			return false;

		if ( vacancyRequest.cur_resp_person_id != LdsCurUserID )
			return false;
	}

	return true;
}


function DoVacancyRequestAction( vacancyRequest, actionID, actionData )
{
	screen = vacancyRequest.Screen;
	if ( actionID == 'resubmit' )
	{
		if ( ! vacancyRequest.view.is_resubmit )
		{
			objectUrl = screen.Doc.Url;

			if ( ui_client.IsObjectCardOpened( objectUrl ) )
				ui_client.CloseObjectCard( objectUrl );
				
			ui_client.HandleOpenObjectCard( objectUrl, {initAction:'view.is_resubmit = true'} );
			Cancel();
		}

		/*if ( ! vacancyRequest.view.is_resubmit )
		{
			DebugMsg(1);
			vacancyRequest.view.is_resubmit = true;
			screen.Update();
			Cancel();
		}*/
	}
	else if ( actionID == 'cancel' )
	{
		lib_base.ask_warning_to_continue( ActiveScreen, UiText.messages.request_will_be_revoked );
	}

	if ( actionID == 'submit' )
		fields_usage.check_object_required_fields( vacancyRequest );

	newActionData = new Object;
	if ( actionData.comment.HasValue )
		newActionData.comment = actionData.comment;

	vacancyRequest.Doc.Save();
	vacancyRequest.Doc.SetChanged( false );
	CallServerMethod( 'lib_recruit_hm_core', 'DoVacancyRequestActionCore', [vacancyRequest.id, actionID, newActionData] );
	DropXQueryCache( vacancyRequest.ObjectUrl );

	lib_base.show_info_message( ActiveScreen, UiText.messages.document_submitted );
	//ui_client.CloseObjectCardScreen( vacancyRequest.Doc.Screen );
	UpdateScreens( '*', '*vacancy_request*' );
	
	ui_client.ReloadObjectPreviewScreen( vacancyRequest.Doc.Screen );
	Cancel();
}


