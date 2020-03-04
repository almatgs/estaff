function BuildReportItems( dest )
{
	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = events;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.filters = new Object;
	queryParam.filters.type_id = 'self_reject';
	queryParam.filters.date = {'$inDateRange':[dest.filter.min_date, dest.filter.max_date]};
	queryParam.xqueryFieldNames = ['vacancy_id','candidate_withdrawal_reason_id'];

	if ( ! dest.filter.event_type_id.HasValue || dest.filter.event_type_id.ByValueExists( 'self_reject' ) )
		eventsArray1 = lib_stat_v2.ExecQueryParam( dest, queryParam );
	else
		eventsArray1 = [];

	queryParam.filters = new Object;
	queryParam.filters.occurrence_id = 'withdrawn';
	queryParam.filters.date = {'$inDateRange':[dest.filter.min_date, dest.filter.max_date]};
	if ( dest.filter.event_type_id.HasValue )
		queryParam.filters.type_id = {'$in':dest.filter.event_type_id};

	eventsArray2 = lib_stat_v2.ExecQueryParam( dest, queryParam );

	eventsArray = ArrayUnion( eventsArray1, eventsArray2 );
	vacanciesArray = ArrayDirect( lib_stat_v2.QueryForeignArraySubset( dest, vacancies, eventsArray, 'vacancy_id', ['recruit_type_id','staff_category_id','org_id'] ) );

	for ( event in eventsArray )
	{
		if ( ! event.candidate_id.HasValue )
			continue;

		if ( event.vacancy_id.HasValue )
			vacancy = ArrayOptFindBySortedKey( vacanciesArray, event.vacancy_id, 'id' );
		else
			vacancy = undefined;

		if ( dest.filter.recruit_type_id.HasValue && ( vacancy == undefined || vacancy.recruit_type_id != dest.filter.recruit_type_id ) )
			continue;

		if ( dest.filter.staff_category_id.HasValue && ( vacancy == undefined || vacancy.staff_category_id != dest.filter.staff_category_id ) )
			continue;

		if ( dest.filter.ChildExists( 'org_id' ) && dest.filter.org_id.HasValue && ( vacancy == undefined || vacancy.org_id != dest.filter.org_id ) )
			continue;

		auxKeyData = new Object;
		
		//if ( candidate != undefined )
			//auxKeyData.location_id = candidate.location_id;

		item = lib_stat_v2.ObtainRecordGroupItem( dest, event, auxKeyData );
		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'withdrawal_count', event );

		fieldID = 'withdrawal_with_reason_' + event.candidate_withdrawal_reason_id + '_count';
		if ( ! dest.spec.fields.ChildByKeyExists( fieldID ) )
			fieldID = 'withdrawal_with_reason_other_count';
		if ( ! dest.spec.fields.ChildByKeyExists( fieldID ) )
			continue;

		lib_stat_v2.AddItemFieldSourceRecord( dest, item, fieldID, event );
	}
}


