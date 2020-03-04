function run_object_state_checker( objectTypeID )
{
	if ( objectTypeID == 'candidate' )
	{
		lib = OpenCodeLib( '//rcr/rcr_agent_candidate_state_checker.js' );
		lib.RunAgentCandidateStateChecker();
		return;
	}

	minDate = DateOffset( DateNewTime( CurDate ), 0 - 30 * 86400 );

	query = 'for $elem in ' + lib_base.object_name_to_catalog_name( objectTypeID ) + ' where $elem/max_state_date >= ' + XQueryLiteral( minDate ) + ' and $elem/max_state_date <= ' + XQueryLiteral( CurDate ) + ' return $elem';

	//alert( query );

	array = XQuery( query );

	for ( object in array )
	{
		if ( ! object.state_id.ForeignElem.max_duration.length.HasValue )
			continue;

		lib_notif.create_notification( UiText.titles.state_overdue + ': ' + object.state_id.ForeignDispName, object, {object_state_id:object.state_id,cascade_seconds:(2*86400)} );
	}
}

