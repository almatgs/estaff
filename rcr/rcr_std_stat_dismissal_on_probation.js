function BuildReportItems( dest )
{
	if ( ! dest.filter.min_date.HasValue && ! dest.filter.max_date.HasValue )
	{
		dest.filter.min_date = Date( Year( CurDate ), Month( CurDate ), 1 );
		dest.filter.max_date = DateOffset( lib_base.get_month_date_offset( dest.filter.min_date, 1 ), 0 - 86400 );
	}

	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = events;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.date = true;
	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.filters = new Object;
	queryParam.filters.type_id = {'$in':['hire','probation']};
	queryParam.xqueryFieldNames = ['candidate_id','vacancy_id'];

	hireEventsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	candidatesArray = ArraySelectAll( lib_stat_v2.QueryForeignArraySubset( dest, candidates, hireEventsArray, 'candidate_id', ['id','est_empl_start_date','probation_end_date'] ) );
	vacanciesArray = ArrayDirect( lib_stat_v2.QueryForeignArraySubset( dest, vacancies, hireEventsArray, 'vacancy_id', ['recruit_type_id'] ) );

	for ( event in hireEventsArray )
	{
		candidate = ArrayOptFindBySortedKey( candidatesArray, event.candidate_id, 'id' );
		if ( candidate == undefined )
			continue;

		if ( candidate.est_empl_start_date < event.date )
			candidate.est_empl_start_date = DateNewTime( event.date );

		vacancy = ArrayOptFindBySortedKey( vacanciesArray, event.vacancy_id, 'id' );
		if ( dest.filter.recruit_type_id.HasValue && ( vacancy == undefined || vacancy.recruit_type_id != dest.filter.recruit_type_id ) )
			continue;

		auxKeyData = new Object;
		
		//if ( candidate != undefined )
			//auxKeyData.location_id = candidate.location_id;

		item = lib_stat_v2.ObtainRecordGroupItem( dest, candidate, auxKeyData );
		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'hire_count', candidate );
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = events;
	queryParam.filters = new Object;
	queryParam.filters.type_id = 'dismiss';
	queryParam.filters.date = {'$gte': dest.filter.min_date};
	queryParam.xqueryFieldNames = ['candidate_id'];

	eventsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	
	for ( event in eventsArray )
	{
		candidate = ArrayOptFindBySortedKey( candidatesArray, event.candidate_id, 'id' );
		if ( candidate == undefined )
			continue;

		if ( ! candidate.est_empl_start_date.HasValue || candidate.est_empl_start_date > event.date )
			continue;

		if ( ! candidate.probation_end_date.HasValue || candidate.probation_end_date < candidate.est_empl_start_date )
		{
			if ( global_settings.probation_period.length.HasValue )
				candidate.probation_end_date = lib_base.get_term_date_offset( candidate.est_empl_start_date, global_settings.probation_period );
			else
				candidate.probation_end_date = DateOffset( candidate.est_empl_start_date, 60 * 86400 );
		}

		if ( event.date < candidate.probation_end_date )
		{
			auxKeyData = new Object;
		
			//if ( candidate != undefined )
				//auxKeyData.location_id = candidate.location_id;

			item = lib_stat_v2.ObtainRecordGroupItem( dest, candidate, auxKeyData );
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'dismiss_on_probation_count', candidate );
		}
	}
}

