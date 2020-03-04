function BuildReportItems( dest )
{
	if ( ! dest.filter.min_date.HasValue && ! dest.filter.max_date.HasValue )
	{
		period = lib_stat_v2.CalcFilterPeriod( dest.spec.settings.default_filter_period );
		dest.filter.min_date = period.startDate;
		dest.filter.max_date = period.endDate;
	}

	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = vacancies;
	queryParam.dynFilters = new Object;
	
	if ( dest.spec.dyn_filters.ChildByKeyExists( 'division_id' ) )
		queryParam.dynFilters.division_id = true;
	
	if ( dest.spec.dyn_filters.ChildByKeyExists( 'org_id' ) )
		queryParam.dynFilters.org_id = true;

	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;

	queryParam.filters = new Object;
	queryParam.filters['$dateRangeIntersects'] = ['start_date', 'deactivate_date', dest.filter.min_date, dest.filter.max_date];
	queryParam.xqueryFieldNames = ['close_date','work_start_date', 'work_end_date'];

	vacanciesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );

	for ( vacancy in vacanciesArray )
	{
		item = lib_stat_v2.ObtainRecordGroupItem( dest, vacancy );
		
		//if ( vacancy.start_date < dest.filter.min_date && ( vacancy.deactivate_date == null || vacancy.deactivate_date >= dest.filter.min_date ) )
		if ( DateFitsRange( dest.filter.min_date, vacancy.start_date, vacancy.deactivate_date ) )
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'init_vacancy_count', vacancy );
		else if ( DateFitsFilterRange( vacancy.start_date, dest.filter.min_date, dest.filter.max_date ) )
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'new_vacancy_count', vacancy );

		if ( DateFitsFilterRange( vacancy.close_date, dest.filter.min_date, dest.filter.max_date ) )
		{
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'closed_vacancy_count', vacancy );
		}
		else if ( DateFitsFilterRange( vacancy.deactivate_date, dest.filter.min_date, dest.filter.max_date ) )
		{
			if ( vacancy.state_id == 'vacancy_suspended' )
			{
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'suspended_vacancy_count', vacancy );
				//lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'final_vacancy_count', vacancy );
				//lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'not_in_work_final_vacancy_count', vacancy );
			}
			else
			{
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'cancelled_vacancy_count', vacancy );
			}
		}
		else
		{
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'final_vacancy_count', vacancy );
		}
	}


	queryParam.filters = new Object;
	queryParam.filters.req_close_date = {'$inDateRange':[dest.filter.min_date, dest.filter.max_date]};

	vacanciesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );

	for ( vacancy in vacanciesArray )
	{
		item = lib_stat_v2.ObtainRecordGroupItem( dest, vacancy );
		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'req_closed_vacancy_count', vacancy );
	}
}


function FinalizeReportItem( dest, item )
{
	field = lib_stat_v2.CreateItemField( dest, item, 'closed_vacancy_count_deviation' );
	field.value = lib_stat_v2.GetItemFieldValue( dest, item, 'closed_vacancy_count' ) - lib_stat_v2.GetItemFieldValue( dest, item, 'req_closed_vacancy_count' );
	if ( field.value < 0 )
		field.bkColor = '255,200,200';
}


function DateFitsRange( date, minDate, maxDate )
{
	if ( date == null )
		return false;

	return date >= minDate && ( maxDate == null || date <= maxDate );
}


function DateFitsFilterRange( date, minDate, maxDate )
{
	if ( date == null )
		return false;

	return date >= minDate && ( maxDate == null || date <= DateNewTime( maxDate, 23, 59, 59 ) );
}
