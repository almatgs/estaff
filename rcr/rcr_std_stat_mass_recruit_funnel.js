function BuildReportItems( dest )
{
	if ( ! dest.filter.min_date.HasValue && ! dest.filter.max_date.HasValue )
	{
		dest.filter.min_date = Date( Year( CurDate ), Month( CurDate ), 1 );
		dest.filter.max_date = DateOffset( lib_base.get_month_date_offset( dest.filter.min_date, 1 ), 0 - 86400 );
	}

	filterMassRecruitType = lib_app2.AppFeatureEnabled( 'classic_recruit' );

	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = events;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.date = true;
	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.filters = new Object;
	queryParam.filters.type_id = {'$in':['phone_interview','group_interview_reg','group_interview_result']};
	queryParam.xqueryFieldNames = ['candidate_id'];

	eventsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	
	candidatesArray = lib_stat_v2.QueryForeignArraySubset( dest, candidates, eventsArray, 'candidate_id', ['location_id','recruit_type_id'] );

	for ( event in eventsArray )
	{
		if ( event.occurrence_id == 'scheduled' || event.occurrence_id == 'cancelled' )
			continue;

		if ( event.candidate_id.HasValue )
			candidate = ArrayOptFindBySortedKey( candidatesArray, event.candidate_id, 'id' );
		else
			candidate = undefined;

		if ( filterMassRecruitType && candidate != undefined && candidate.recruit_type_id != 'selection' )
			continue;

		auxKeyData = new Object;
		
		if ( candidate != undefined )
			auxKeyData.location_id = candidate.location_id;

		item = lib_stat_v2.ObtainRecordGroupItem( dest, event, auxKeyData );

		switch ( event.type_id )
		{
			case 'probation':
				fieldID = 'hire_count';
				break;

			default:
				fieldID = event.type_id + '_count';
		}

		if ( dest.spec.fields.ChildByKeyExists( fieldID ) )
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, fieldID, event );

		if ( event.occurrence_id.HasValue )
		{
			fieldID = event.type_id + '_' + event.occurrence_id + '_count';
			if ( dest.spec.fields.ChildByKeyExists( fieldID ) )
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, fieldID, event );
		}

		if ( event.type_id == 'group_interview_result' )
		{
			if ( event.occurrence_id == 'succeeded' || event.occurrence_id == 'failed' )
			{
				fieldID = event.type_id + '_attended_count';
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, fieldID, event );
			}
		}
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = events;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.date = true;
	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.filters = new Object;
	queryParam.filters.type_id = {'$in':['hire','probation']};
	queryParam.xqueryFieldNames = ['candidate_id'];

	hireEventsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	candidatesArray = lib_stat_v2.QueryForeignArraySubset( dest, candidates, hireEventsArray, 'candidate_id', ['location_id','recruit_type_id'] );

	for ( event in hireEventsArray )
	{
		if ( event.candidate_id.HasValue )
			candidate = ArrayOptFindBySortedKey( candidatesArray, event.candidate_id, 'id' );
		else
			candidate = undefined;

		if ( filterMassRecruitType && candidate != undefined && candidate.recruit_type_id != 'selection' )
			continue;

		auxKeyData = new Object;
		
		if ( candidate != undefined )
			auxKeyData.location_id = candidate.location_id;

		item = lib_stat_v2.ObtainRecordGroupItem( dest, event, auxKeyData );

		switch ( event.type_id )
		{
			case 'probation':
				fieldID = 'hire_count';
				break;

			default:
				fieldID = event.type_id + '_count';
		}

		if ( dest.spec.fields.ChildByKeyExists( fieldID ) )
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, fieldID, event );
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = events;
	queryParam.filters = new Object;
	queryParam.filters.type_id = 'dismiss';
	queryParam.filters.date = {'$gte': dest.filter.min_date};
	queryParam.xqueryFieldNames = ['candidate_id'];

	eventsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	candidatesArray = lib_stat_v2.QueryForeignArraySubset( dest, candidates, eventsArray, 'candidate_id', ['location_id','recruit_type_id'] );
	
	for ( event in eventsArray )
	{
		hireEvent = ArrayOptFindByKey( hireEventsArray, event.candidate_id, 'candidate_id' );
		if ( hireEvent == undefined || hireEvent.date > event.date )
			continue;

		if ( DateDiff( event.date, hireEvent.date ) > 60 * 86400 )
			continue;

		if ( event.candidate_id.HasValue )
			candidate = ArrayOptFindBySortedKey( candidatesArray, event.candidate_id, 'id' );
		else
			candidate = undefined;

		if ( filterMassRecruitType && candidate != undefined && candidate.recruit_type_id != 'selection' )
			continue;

		auxKeyData = new Object;
		
		if ( candidate != undefined )
			auxKeyData.location_id = candidate.location_id;

		item = lib_stat_v2.ObtainRecordGroupItem( dest, event, auxKeyData );

		fieldID = 'dismiss_on_probation_count';

		if ( dest.spec.fields.ChildByKeyExists( fieldID ) )
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, fieldID, event );
	}
}

