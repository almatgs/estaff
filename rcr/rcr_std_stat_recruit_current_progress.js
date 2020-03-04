function InitReport( dest )
{
	if ( ! dest.filter.user_id.HasValue )
		dest.filter.user_id = lib_user.active_user_info.id;

	if ( ! lib_user.use_groups )
		dest.spec.dyn_filters.GetChildByKey( 'group_id' ).Delete();

	if ( global_settings.is_agency )
		dest.spec.fields.GetChildByKey( 'division_id' ).Delete();
	else
		dest.spec.fields.GetChildByKey( 'org_id' ).Delete();

	if ( global_settings.use_vacancy_work_wdays )
		dest.spec.fields.GetChildByKey( 'cur_work_days_num' ).Delete();
	else
		dest.spec.fields.GetChildByKey( 'cur_work_wdays_num' ).Delete();

	dest.build_stages_num = 4;
}


function BuildReportItems( dest )
{
	lib_base.check_catalog_filter_constraints( 'candidates', 'user_id', dest.filter.user_id );

	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = vacancies;
	queryParam.filters = new Object;
	queryParam.filters.is_active = true;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.recruit_type_id = true;
	queryParam.dynFilters.user_id = true;
	if ( lib_user.use_groups )
		queryParam.dynFilters.group_id = true;
	queryParam.xqueryFieldNames = ['name','division_id','org_id','final_candidate_id'];

	vacanciesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( vacancy in vacanciesArray )
	{
		item = lib_stat_v2.AddExplicitRecordGroupItem( dest, vacancy, 'vacancy_id' );
		if ( global_settings.is_agency )
			lib_stat_v2.SetItemFieldValue( dest, item, 'org_id', vacancy.org_id.ForeignDispName );
		else
			lib_stat_v2.SetItemFieldValue( dest, item, 'division_id', vacancy.division_id.ForeignDispName );

		if ( global_settings.use_vacancy_work_wdays )
		{
			lib_stat_v2.SetItemFieldValue( dest, item, 'cur_work_wdays_num', vacancy.cur_work_wdays_num );
			item.fields.cur_work_wdays_num.bkColor = vacancy.cur_work_wdays_num_bk_color;
		}
		else
		{
			lib_stat_v2.SetItemFieldValue( dest, item, 'cur_work_days_num', vacancy.cur_work_days_num );
			item.fields.cur_work_days_num.bkColor = vacancy.cur_work_wdays_num_bk_color;
		}
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = vacancy_ads;
	queryParam.filters = new Object;
	queryParam.filters.vacancy_id = {'$in':ArrayExtract( vacanciesArray, 'id' )};
	queryParam.xqueryFieldNames = ['is_active','vacancy_id','resp_candidates_num','new_resp_candidates_num'];

	vacancyAdsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( vacancyAd in vacancyAdsArray )
	{
		item = lib_stat_v2.ObtainRecordGroupItem( dest, vacancyAd );

		if ( vacancyAd.is_active )
			lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'vacancy_ad_count', vacancyAd );

		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'resp_candidate_count', vacancyAd, vacancyAd.resp_candidates_num );
		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'new_resp_candidate_count', vacancyAd, vacancyAd.new_resp_candidates_num );
	}


	minStateDate = DateOffset( DateNewTime( CurDate ), 0 - 120 * 86400 );

	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = candidates;
	queryParam.filters = new Object;
	queryParam.filters.state_date = {'$gte':minStateDate};
	queryParam.filters['spots.spot.vacancy_id'] = {'$in':ArrayExtract( vacanciesArray, 'id' )};
	queryParam.xqueryFieldNames = ['entrance_type_id', 'main_vacancy_id'];

	candidatesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	unboundCandidates = new Array;
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
			if ( spot.vacancy_id != null && ( vacancy = ArrayOptFindByKey( vacanciesArray, spot.vacancy_id, 'id' ) ) == undefined )
				continue;

			item = lib_stat_v2.ObtainRecordGroupItem( dest, candidate, {vacancy_id:spot.vacancy_id} );

			if ( candidate.entrance_type_id == 'vacancy_response' )
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'stored_resp_candidate_count', candidate );
			else
				lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'passive_candidate_count', candidate );

			switch ( spot.state_id )
			{
				case 'new':
				case 'vacancy_response':
				case 'candidate_phone_call':
				case 'candidate_phone_call:peer_undecided':
				case 'candidate_phone_call:call_failed':
				case 'candidate_phone_call:call_later':
				case 'candidate_phone_call:alt_email_sent':
				case 'invitation':
				case 'phone_interview:scheduled':
				case 'phone_interview':
				case 'phone_interview:succeeded':
				case 'phone_interview:reserve':
				case 'phone_interview:peer_undecided':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'new_candidate_count', candidate );
					break;

				case 'interview:scheduled':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'interview_scheduled_count', candidate );
					break;

				case 'interview':
				case 'interview:succeeded':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'interview_completed_count', candidate );
					break;

				case 'interview:reserve':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'interview_reserve_count', candidate );
					break;

				case 'rr_resume_review':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rr_resume_review_count', candidate );
					break;

				case 'rr_resume_review:reserve':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rr_resume_review_reserve_count', candidate );
					break;

				case 'rr_interview:scheduled':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rr_interview_scheduled_count', candidate );
					break;

				case 'rr_interview':
				case 'rr_interview:succeeded':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rr_interview_completed_count', candidate );
					break;

				case 'rr_interview:reserve':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rr_interview_reserve_count', candidate );
					break;

				default:
					if ( spot.state_id.ForeignElem.make_candidate_final || ( vacancy.final_candidate_id == candidate.id && spot.is_active ) )
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'final_candidate_count', candidate );
					else if ( spot.is_active )
					{
						unboundCandidates.push( candidate );
						candidate.main_vacancy_id = spot.vacancy_id;
					}
			}
		}
	}


	if ( unboundCandidates.length != 0 )
	{
		unboundCandidates = ArraySort( unboundCandidates, 'id', '+' );

		queryParam = lib_stat_v2.CreateQueryParam();
		queryParam.catalog = events;
		queryParam.filters = new Object;
		queryParam.filters.date = {'$gte':minStateDate};
		queryParam.filters.candidate_id = {'$in':ArrayExtract( unboundCandidates, 'id' )};
		queryParam.filters.type_id = {'$in':['interview', 'rr_resume_review', 'rr_interview']};
		queryParam.xqueryFieldNames = ['type_id','candidate_id'];

		eventsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
		eventsArray = ArrayUnion( ArraySelectByKey( eventsArray, 'rr_interview', 'type_id' ), ArraySelectByKey( eventsArray, 'rr_resume_review', 'type_id' ), ArraySelectByKey( eventsArray, 'interview', 'type_id' ) );

		for ( event in eventsArray )
		{
			if ( event.occurrence_id == 'cancelled' )
				continue;

			index = unboundCandidates.FindIndexBySortedKey( event.candidate_id, 'id' );
			if ( index < 0 )
				continue;

			candidate = unboundCandidates[index];

			auxKeyData = new Object;

			if ( event.vacancy_id.HasValue )
				auxKeyData.vacancy_id = event.vacancy_id;
			else
				auxKeyData.vacancy_id = candidate.main_vacancy_id;

			item = lib_stat_v2.ObtainRecordGroupItem( dest, candidate, auxKeyData );

			switch ( event.type_id )
			{
				case 'interview':
					if ( event.occurrence_id == 'scheduled' )
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'interview_scheduled_count', candidate );
					else if ( event.occurrence_id == 'reserve' )
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'interview_reserve_count', candidate );
					else
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'interview_completed_count', candidate );
					break;

				case 'rr_resume_review':
					lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rr_resume_review_count', candidate );
					break;

				case 'rr_interview':
					if ( event.occurrence_id == 'scheduled' )
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rr_interview_scheduled_count', candidate );
					else if ( event.occurrence_id == 'reserve' )
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rr_interview_reserve_count', candidate );
					else
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'rr_interview_completed_count', candidate );
					break;
			}

			unboundCandidates.splice( index, 1 );
		}
	}

	for ( candidate in unboundCandidates )
	{
		item = lib_stat_v2.ObtainRecordGroupItem( dest, candidate, {vacancy_id:candidate.main_vacancy_id} );
		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'new_candidate_count', candidate );
	}
}


function FinalizeReportItem( dest, item )
{
	if ( lib_stat_v2.GetItemFieldValue( dest, item, 'new_resp_candidate_count' ) > 0 )
		item.fields.new_resp_candidate_count.bkColor = '255,255,128';

	if ( lib_stat_v2.GetItemFieldValue( dest, item, 'interview_scheduled_count' ) > 0 )
		item.fields.interview_scheduled_count.bkColor = lib_event.bk_color_scheduled;

	if ( lib_stat_v2.GetItemFieldValue( dest, item, 'rr_interview_scheduled_count' ) > 0 )
		item.fields.rr_interview_scheduled_count.bkColor = lib_event.bk_color_scheduled;

	if ( lib_stat_v2.GetItemFieldValue( dest, item, 'final_candidate_count' ) > 0 )
		item.fields.final_candidate_count.bkColor = '230,255,230';
}