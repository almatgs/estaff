function Display()
{
	ActiveScreen.Navigate( this.Doc.Url, 'FrameTelephonyPanel2', true );
}


function Update()
{
	if ( OptScreen != undefined )
	{
		//DebugMsg( OptScreen );
		OptScreen.Update();
	}
}


function SetActiveCall( activeCall )
{
	if ( curPhoneCallRecord != activeCall )
	{
		if ( curLookupThread != undefined && curLookupThread.IsRunning )
			curLookupThread.Kill();

		found_persons.Clear();
	}

	curPhoneCallRecord = activeCall;

	if ( activeCall.is_incoming )
		StartPersonLookup();

	Display();
}


function DeleteActiveCall( activeCall )
{
	if ( curPhoneCallRecord != activeCall )
		return;

	curPhoneCallRecord = undefined;

	if ( curLookupThread != undefined && curLookupThread.IsRunning )
		curLookupThread.Kill();

	if ( OptScreen != undefined )
	{
		Screen.Close();
		//Update();
	}
}



function HandleCreateNewCandidate()
{
	candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
	candidate = candidateDoc.TopElem;
	
	candidate.AssignElem( this.curPhoneCallRecord.src_person_data );
	candidate.mobile_phone = this.curPhoneCallRecord.src_phone_number;
	
	InitCandidateState( candidate );

	CreateDocScreen( candidateDoc );

	//curPhoneCallRecord.baseObject = candidateDoc.TopElem;
}


function InitCandidateState( candidate )
{
	eventData = new Object;

	if ( this.curPhoneCallRecord.src_person_data.dest_candidate_state_id.HasValue )
		stateID = this.curPhoneCallRecord.src_person_data.dest_candidate_state_id;
	else if ( this.curPhoneCallRecord.src_person_data.talk_transcript.HasValue || this.curPhoneCallRecord.src_person_data.talk_recording_url.HasValue )
	{
		stateID = 'note';
		eventData.comment = UiText.titles.call_result;
	}
	else
		return;

	if ( stateID == 'new' )
		return;
	
	if ( this.curPhoneCallRecord.src_person_data.talk_transcript.HasValue )
		eventData.talk_transcript = this.curPhoneCallRecord.src_person_data.talk_transcript;

	if ( this.curPhoneCallRecord.src_person_data.talk_recording_url.HasValue )
		eventData.talk_recording_url = this.curPhoneCallRecord.src_person_data.talk_recording_url;

	lib_candidate.SetCandidateState( candidate, stateID, eventData, {isSilent:true} );
}


function HandleCreateNewContactPerson()
{
	personDoc = DefaultDb.OpenNewObjectDoc( 'person' );
	person = personDoc.TopElem;

	person.AssignElem( this.curPhoneCallRecord.src_person_data );
	person.mobile_phone = this.curPhoneCallRecord.src_phone_number;

	CreateDocScreen( personDoc );

	//curPhoneCallRecord.baseObject = candidateDoc.TopElem;
}


function HandleOpenFoundPerson()
{
	screen = ObtainDocScreen( this.curPhoneCallRecord.src_person_id.ForeignPrimaryObjectUrl );
	//if ( bindToCall )
		//curPhoneCallRecord.baseObject = screen.Doc.TopElem;
}


function TimerAction()
{
	if ( curPhoneCallRecord == undefined || curPhoneCallRecord.state_id != 'connected' )
		return;

	label = Screen.FindOptItem( 'CallDurationLabel' );
	if ( label == undefined )
		return;

	label.UpdateText();
}


function GetActiveCallDurationDesc()
{
	callDuration = curPhoneCallRecord.cur_talk_seconds;
	if ( callDuration == null )
		return '';

	hours = callDuration / 3600;
	minutes = callDuration / 60;
	seconds = callDuration % 60;

	if ( hours != 0 )
		str = hours + ':';
	else
		str = '';
						
	str += StrInt( minutes, 2 ) + ':' + StrInt( seconds, 2 );
	return str;
}
				