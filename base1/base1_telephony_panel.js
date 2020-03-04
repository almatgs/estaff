function Display()
{
	ActiveScreen.Navigate( this.Doc.Url, 'FrameTelephonyPanel', true );
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
	if ( curActiveCall != activeCall )
	{
		if ( curLookupThread != undefined && curLookupThread.IsRunning )
			curLookupThread.Kill();

		found_persons.Clear();
	}

	curActiveCall = activeCall;

	if ( activeCall.is_incoming )
		StartPersonLookup();

	Display();
}


function DeleteActiveCall( activeCall )
{
	if ( curActiveCall != activeCall )
		return;

	curActiveCall = undefined;

	if ( curLookupThread != undefined && curLookupThread.IsRunning )
		curLookupThread.Kill();

	if ( OptScreen != undefined )
	{
		Screen.Close();
		//Update();
	}
}


function StartPersonLookup( phone )
{
	if ( curActiveCall.phone == '' )
		return '';

	if ( curLookupThread != undefined && curLookupThread.IsRunning )
		curLookupThread.Kill();

	thread = new Thread;
	thread.Param.panel = this;
	thread.Param.phone = RValue( curActiveCall.phone );

	curLookupThread = thread;
	thread.EvalCode( 'Param.panel.PersonLookupThreadProc( ActiveThread )' );
	
	if ( OptScreen != undefined )
		Screen.Update();
}


function PersonLookupThreadProc( thread )
{
	queryStr = 'for $elem in candidates where $elem/mobile_phone = ' + XQueryLiteral( thread.Param.phone ) + ' return $elem';
	personsArray = XQuery( queryStr );

	personsArray = ArraySort( personsArray, 'fullname', '+' );

	Sleep( 1000 );
	
	EvalAsync( 'panel.OnPersonLookupFinished( personsArray )', 'panel', thread.Param.panel, 'personsArray', personsArray );
}


function OnPersonLookupFinished( personsArray )
{
	found_persons.Clear();

	for ( person in personsArray )
	{
		found_persons.AddChild().person_id = person.id;
	}

	Screen.Update();
}


function HandleCreateNewCandidate()
{
	candidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
	candidateDoc.TopElem.mobile_phone = curActiveCall.phone;
	CreateDocScreen( candidateDoc );

	curActiveCall.baseObject = candidateDoc.TopElem;
}


function HandleOpenFoundPerson( foundPerson, bindToCall )
{
	screen = ObtainDocScreen( ObjectDocUrl( 'data', 'candidate', foundPerson.person_id ) );
	if ( bindToCall )
		curActiveCall.baseObject = screen.Doc.TopElem;
}


function TimerAction()
{
	if ( curActiveCall == undefined || ! curActiveCall.is_connected )
		return;

	label = Screen.FindOptItem( 'CallDurationLabel' );
	if ( label == undefined )
		return;

	label.UpdateText();
}


function GetActiveCallDurationDesc()
{
	callDuration = ( GetCurTicks() - curActiveCall.conn_start_ticks ) / 1000;

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
				