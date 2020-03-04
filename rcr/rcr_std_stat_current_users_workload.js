function BuildReportItems( dest )
{
	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = vacancies;
	queryParam.filters = new Object;
	queryParam.filters.is_active = true;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.recruit_type_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.xqueryFieldNames = ['name','recruit_metrics_set_id','recruit_type_id','staff_category_id'];

	vacanciesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( vacancy in vacanciesArray )
	{
		item = lib_stat_v2.ObtainRecordGroupItem( dest, vacancy, {vacancy_id:vacancy.id} );
		//lib_stat_v2.SetItemFieldValue( dest, item, 'name', vacancy.name );
		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'vacancy_count', vacancy );
		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'cur_workload', vacancy, lib_vacancy.GetVacancyWorkloadMultiplier( vacancy ) );

		if ( lib_vacancy.IsVacancyOverdue( vacancy ) )
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'overdue_vacancy_count', vacancy );
	}
}

