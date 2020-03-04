function RunEventTypeOccurrenceTransition( eventTypeID, oldOccurrenceID, newOccurrenceID )
{
	eventType = GetOptForeignElem( event_types, eventTypeID );
	if ( eventType == undefined )
		throw 'No such event type: ' + eventTypeID;

	if ( ! eventType.is_active )
		throw 'Event type is disabled: ' + eventTypeID;

	if ( eventType.get_opt_occurrence( newOccurrenceID ) == undefined )
		throw 'No such occurrence: ' + eventTypeID + ':' + newOccurrenceID;

	EnableLog( 'event-transition', true );
	LogEvent( 'event-transition', 'EVENT TRANSITION STARTED: ' + eventTypeID + ' ' + oldOccurrenceID + '>>' + newOccurrenceID );


	queryStr = 'for $elem in events where $elem/type_id = ' + XQueryLiteral( eventTypeID ) + ' and $elem/occurrence_id = ' + XQueryLiteral( oldOccurrenceID ) + ' order by $elem/date return $elem/Fields( "id","is_derived" )';
	eventsArray = XQuery( queryStr );
	urls = ArrayExtract( eventsArray, 'This.ObjectUrl' );
	
	LogEvent( 'event-transition', 'Events found: ' + ArrayCount( urls ) );

	for ( url in urls )
	{
		eventDoc = OpenDoc( url );
		event = eventDoc.TopElem;
		event.occurrence_id = newOccurrenceID;
		eventDoc.WriteDocInfo = false;
		eventDoc.RunActionOnSave = false;
		eventDoc.Save();

		LogEvent( 'event-transition', 'Event processed: ' + event.id.XmlValue );
	}

	queryStr = 'for $elem in candidates where $elem/state_id = ' + XQueryLiteral( lib_event.build_state_id( eventTypeID, oldOccurrenceID ) ) + ' order by $elem/fullname return $elem/Fields( "id" )';
	candidatesArray = XQuery( queryStr );
	urls = ArrayExtract( candidatesArray, 'This.ObjectUrl' );
	
	LogEvent( 'event-transition', 'Candidates found: ' + ArrayCount( urls ) );

	for ( url in urls )
	{
		candidateDoc = OpenDoc( url );
		candidate = candidateDoc.TopElem;
		candidate.update_state();
		candidateDoc.WriteDocInfo = false;
		candidateDoc.RunActionOnSave = false;
		candidateDoc.Save();

		LogEvent( 'event-transition', 'Candidate processed: ' + candidate.id.XmlValue + ' ' + candidate.lastname );
	}

	LogEvent( 'event-transition', 'EVENT TRANSITION FINISHED' );
}

