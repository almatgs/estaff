function InitReport( dest )
{
	dest.build_stages_num = 4;
}


function BuildReportItems( dest )
{
	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = vacancies;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.dynFilters.recruit_type_id = true;
	queryParam.filters = new Object;
	queryParam.filters['$dateRangeIntersects'] = ['start_date', 'deactivate_date', dest.filter.min_date, dest.filter.max_date];
	queryParam.xqueryFieldNames = ['name'];

	vacanciesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( vacancy in vacanciesArray )
	{
		item = lib_stat_v2.ObtainRecordGroupItem( dest, vacancy, {vacancy_id:vacancy.id} );
		lib_stat_v2.SetItemFieldValue( dest, item, 'name', vacancy.name );
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = candidates;
	queryParam.filters = new Object;
	queryParam.filters['spots.spot.vacancy_id'] = {'$in':ArrayExtract( vacanciesArray, 'id' )};
	queryParam.xqueryFieldNames = ['main_vacancy_id'];

	candidatesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = candidates;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.dynFilters.recruit_type_id = true;
	queryParam.filters = new Object;
	queryParam.filters.main_vacancy_id = null;
	queryParam.filters.state_date = {'$inDateRange':[dest.filter.min_date, dest.filter.max_date]};
	queryParam.xqueryFieldNames = ['main_vacancy_id','spots','is_active','state_id'];

	candidatesArray2 = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( candidate in ArrayUnion( candidatesArray, candidatesArray2 ) )
	{
		if ( candidate.spots.ChildNum != 0 )
		{
			spotsArray = candidate.spots;
		}
		else
		{
			//spotsArray = [{vacancy_id:null}];
			spotsArray = [{vacancy_id:candidate.main_vacancy_id,is_active:candidate.is_active,state_id:candidate.state_id}];
		}

		for ( spot in spotsArray )
		{
			if ( spot.vacancy_id != null && ArrayOptFindByKey( vacanciesArray, spot.vacancy_id, 'id' ) == undefined )
				continue;

			item = lib_stat_v2.ObtainRecordGroupItem( dest, candidate, {vacancy_id:spot.vacancy_id} );
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'selected_candidate_count', candidate );

			if ( ! spot.is_active && ( spot.state_id != 'hire' && spot.state_id != 'dismiss' && spot.state_id != 'probation' ) )
			{
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'failed_candidate_count', candidate );

				switch ( spot.state_id )
				{
					case 'reject':
					case 'candidate_phone_call:failed':
					case 'phone_interview:failed':
					case 'interview:failed':
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rejected_by_recruiter_candidate_count', candidate );
						break;

					case 'rr_reject':
					case 'rr_resume_review:failed':
					case 'rr_interview:failed':
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rejected_by_rr_candidate_count', candidate );
						break;

					case 'self_reject':
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'withdrawn_candidate_count', candidate );
						break;

					default:
						if ( StrEnds( spot.state_id, ':withdrawn' ) )
							lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'withdrawn_candidate_count', candidate );
						else
							lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'other_failed_candidate_count', candidate );
				}
			}
		}
	}
}


