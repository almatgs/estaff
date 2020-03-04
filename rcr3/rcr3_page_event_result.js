function Init()
{
	webQuery = UrlQuery( System.WebClientUrl );

	event = GetOptForeignElem( events, Int( webQuery.event_id ) );
	if ( event == undefined )
		throw UserError( 'Event is not found' );

	eventDoc = OpenDoc( event.PrimaryObjectUrl );
	event = eventDoc.TopElem;

	candidate = event.candidate_id.ForeignElem;
}