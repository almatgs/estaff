function BuildReportItems( dest )
{
	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = vacancy_instances;
	queryParam.dynFilters = new Object;
	
	if ( dest.spec.dyn_filters.ChildByKeyExists( 'division_id' ) )
		queryParam.dynFilters.division_id = true;
	
	if ( dest.spec.dyn_filters.ChildByKeyExists( 'org_id' ) )
		queryParam.dynFilters.org_id = true;

	queryParam.dynFilters.recruit_type_id = true;
	queryParam.dynFilters.group_id = true;

	queryParam.filters = new Object;
	queryParam.filters.close_date = {'$inDateRange':[dest.filter.min_date, dest.filter.max_date]};
	queryParam.xqueryFieldNames = ['close_date','req_close_date','work_days_num'];

	vacancyInstancesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );

	for ( vacancyInstance in vacancyInstancesArray )
	{
		item = lib_stat_v2.ObtainRecordGroupItem( dest, vacancyInstance );
		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'closed_vacancy_count', vacancyInstance );

		if ( vacancyInstance.req_close_date.HasValue && vacancyInstance.close_date > vacancyInstance.req_close_date )
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'closed_after_deadline_vacancy_count', vacancyInstance );

		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'work_days_num', vacancyInstance, vacancyInstance.work_days_num );
	}
}


function FinalizeReportItem( dest, item )
{
	if ( lib_stat_v2.GetItemFieldValue( dest, item, 'closed_after_deadline_vacancy_count' ) > 0 )
		item.fields['closed_after_deadline_vacancy_count'].bkColor = '255,200,200';

	if ( lib_stat_v2.GetItemFieldValue( dest, item, 'closed_vacancy_count' ) != 0 )
	{
		percent = ( ( lib_stat_v2.GetItemFieldValue( dest, item, 'closed_vacancy_count' ) - lib_stat_v2.GetItemFieldValue( dest, item, 'closed_after_deadline_vacancy_count' ) ) * 100 ) / lib_stat_v2.GetItemFieldValue( dest, item, 'closed_vacancy_count' );
		lib_stat_v2.SetItemFieldValue( dest, item, 'closed_before_deadline_vacancy_percent', percent );
	}
}


