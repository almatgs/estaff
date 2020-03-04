function InitReport( dest )
{
	dest.build_stages_num = 5;
}


function BuildReportItems( dest )
{
	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = vacancies;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.filters = new Object;
	queryParam.filters['$dateRangeIntersects'] = ['start_date', 'deactivate_date', dest.filter.min_date, dest.filter.max_date];
	queryParam.xqueryFieldNames = ['name','group_id'];

	vacanciesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	vacanciesArray = ArraySort( vacanciesArray, 'id', '+' );
	for ( vacancy in vacanciesArray )
	{
		item = lib_stat_v2.ObtainRecordGroupItem( dest, vacancy, {vacancy_id:vacancy.id} );
		lib_stat_v2.SetItemFieldValue( dest, item, 'name', vacancy.name );
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = vacancy_ads;
	queryParam.filters = new Object;
	queryParam.filters.vacancy_id = {'$in':ArrayExtract( vacanciesArray, 'id' )};
	queryParam.xqueryFieldNames = ['resp_candidates_num'];

	vacancyAdsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( vacancyAd in vacancyAdsArray )
	{
		if ( vacancyAd.vacancy_id == null || ( vacancy = ArrayOptFindBySortedKey( vacanciesArray, vacancyAd.vacancy_id, 'id' ) ) == undefined )
			continue;

		auxKeyData = new Object;
		auxKeyData.user_id = vacancy.user_id;
		auxKeyData.group_id = vacancy.group_id;

		for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, vacancyAd, auxKeyData ) )
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'resp_candidate_count', vacancyAd, vacancyAd.resp_candidates_num );
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = candidates;
	queryParam.filters = new Object;
	queryParam.filters['spots.spot.vacancy_id'] = {'$in':ArrayExtract( vacanciesArray, 'id' )};
	queryParam.xqueryFieldNames = ['entrance_type_id', 'main_vacancy_id'];

	candidatesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( candidate in candidatesArray )
	{
		if ( candidate.spots.ChildNum != 0 )
		{
			spotsArray = candidate.spots;
		}
		else
		{
			//spotsArray = [{vacancy_id:null}];
			spotsArray = [];
		}

		for ( spot in spotsArray )
		{
			if ( spot.vacancy_id == null )
				continue;

			vacancy = ArrayOptFindBySortedKey( vacanciesArray, spot.vacancy_id, 'id' );
			if ( vacancy == undefined )
				continue;

			auxKeyData = new Object;
			auxKeyData.vacancy_id = spot.vacancy_id;
			auxKeyData.user_id = vacancy.user_id;
			auxKeyData.group_id = vacancy.group_id;

			for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, candidate, auxKeyData ) )
			{
				if ( candidate.entrance_type_id == 'vacancy_response' )
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'stored_resp_candidate_count', candidate );
				else if ( candidate.entrance_type_id == 'active_search' )
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'active_search_candidate_count', candidate );
				else
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'other_source_candidate_count', candidate );

				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'selected_candidate_count', candidate );
			}
		}
	}


	candidatesArray = ArraySort( candidatesArray, 'id', '+' );


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = events;
	queryParam.filters = new Object;
	queryParam.filters.date = {'$gte':dest.filter.min_date};
	queryParam.filters.type_id = {'$in':['phone_interview', 'interview', 'rr_resume_review', 'rr_interview', 'job_offer', 'hire']};
	queryParam.xqueryFieldNames = ['candidate_id'];

	eventsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	

	for ( event in eventsArray )
	{
		candidate = ArrayOptFindBySortedKey( candidatesArray, event.candidate_id, 'id' );
		if ( candidate == undefined )
			continue;

		auxKeyData = new Object;

		if ( event.vacancy_id.HasValue )
			auxKeyData.vacancy_id = event.vacancy_id;
		else
			auxKeyData.vacancy_id = candidate.main_vacancy_id;

		if ( auxKeyData.vacancy_id == null || ( vacancy = ArrayOptFindBySortedKey( vacanciesArray, auxKeyData.vacancy_id, 'id' ) ) == undefined )
			continue;

		auxKeyData.user_id = vacancy.user_id;
		auxKeyData.group_id = vacancy.group_id;

		if ( event.type_id == 'interview' )
		{
			for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, candidate, auxKeyData ) )
			{
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'interview_reg_count', candidate );

				if ( event.occurrence_id != 'scheduled' && event.occurrence_id != 'cancelled' )
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'interview_completed_count', candidate );
			}
		}
		else if ( event.type_id == 'rr_resume_review' )
		{
			for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, candidate, auxKeyData ) )
			{
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'submitted_to_hm_count', candidate );
			}
		}
		else if ( event.type_id == 'rr_interview' )
		{
			for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, candidate, auxKeyData ) )
			{
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'hm_interview_reg_count', candidate );

				if ( ( event.occurrence_id == '' || event.occurrence_id == 'succeeded' ) && candidate.state_id != 'rr_reject' )
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'hm_interview_succeeded_count', candidate );
			}
		}
		else if ( event.type_id == 'job_offer' )
		{
			for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, candidate, auxKeyData ) )
			{
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'job_offer_count', candidate );
			}
		}
		else if ( event.type_id == 'hire' )
		{
			for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, candidate, auxKeyData ) )
			{
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'hire_count', candidate );
			}
		}
	}
}


function FinalizeReportItem( dest, item )
{
	lib_stat_v2.SetItemFieldValue( dest, item, 'viewed_candidate_count', lib_stat_v2.GetItemFieldValue( dest, item, 'resp_candidate_count' ) + lib_stat_v2.GetItemFieldValue( dest, item, 'active_search_candidate_count' ) + lib_stat_v2.GetItemFieldValue( dest, item, 'other_source_candidate_count' ) );
}