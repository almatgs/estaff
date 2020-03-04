function InitReport( dest )
{
	sampleFieldSpec = dest.spec.fields.GetChildByKey( 'event_xxx_date' );

	index = sampleFieldSpec.ChildIndex;

	for ( eventTypeID in dest.spec.settings.multi_event_type_id )
	{
		eventType = eventTypeID.ForeignElem;

		fieldSpec = dest.spec.fields.InsertChild( index );
		fieldSpec.AssignElem( sampleFieldSpec );
		fieldSpec.id = StrReplaceOne( sampleFieldSpec.id, 'xxx', eventType.id );
		fieldSpec.col_title = eventType.name;

		index++;
	}

	sampleFieldSpec.Delete();

	//dest.build_stages_num = 4;
}


function BuildReportItems( dest )
{
	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = vacancies;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.filters = new Object;
	if ( dest.filter.vacancy_id.HasValue )
		queryParam.filters.id = dest.filter.vacancy_id;
	queryParam.xqueryFieldNames = ['id','name'];

	vacanciesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( vacancy in vacanciesArray )
	{
		item = lib_stat_v2.AddExplicitRecordGroupItem( dest, vacancy, 'vacancy_id' );
		//lib_stat_v2.SetItemFieldValue( dest, item, 'name', vacancy.name );
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = candidates;
	queryParam.filters = new Object;
	queryParam.filters['spots.spot.vacancy_id'] = {'$in':ArrayExtract( vacanciesArray, 'id' )};
	queryParam.xqueryFieldNames = ['entrance_type_id', 'main_vacancy_id', 'last_comment'];

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
			if ( spot.vacancy_id != null && ArrayOptFindByKey( vacanciesArray, spot.vacancy_id, 'id' ) == undefined )
				continue;

			item = lib_stat_v2.AddExplicitRecordGroupItem( dest, candidate, 'candidate_id', {vacancy_id:spot.vacancy_id} );
			
			lib_stat_v2.SetItemFieldValue( dest, item, 'spot_start_date', spot.start_date );
			lib_stat_v2.SetItemFieldValue( dest, item, 'state_id', spot.state_id.ForeignDispName );
			lib_stat_v2.SetItemFieldValue( dest, item, 'state_date', spot.state_date );
			item.fields.state_id.textColor = spot.state_id.ForeignElem.text_color;

			if ( spot.last_comment.HasValue )
				lib_stat_v2.SetItemFieldValue( dest, item, 'last_comment', spot.last_comment );
			else if ( candidate.last_comment.HasValue )
				lib_stat_v2.SetItemFieldValue( dest, item, 'last_comment', candidate.last_comment );

			/*for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, candidate, {vacancy_id:spot.vacancy_id} ) )
			{
				//lib_stat_v2.AddExplicitRecordGroupItem( dest, candidate, 'candidate_id' );
			}*/
		}
	}

	if ( ArrayCount( candidatesArray ) == 0 )
		return;

	if ( dest.spec.settings.multi_event_type_id.HasValue )
	{
		candidatesArray = ArraySort( candidatesArray, 'id', '+' );

		queryParam = lib_stat_v2.CreateQueryParam();
		queryParam.catalog = events;
		queryParam.filters = new Object;
		queryParam.filters.type_id = {'$in':ArraySelectAll( dest.spec.settings.multi_event_type_id )};
		queryParam.filters['candidate_id'] = {'$in':ArrayExtract( candidatesArray, 'id' )};
		queryParam.xqueryFieldNames = ['candidate_id','vacancy_id'];

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

			item = lib_stat_v2.ObtainRecordGroupItem( dest, event, auxKeyData );
			//lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'event_' + event.type_id + '_date', event );
			lib_stat_v2.SetItemFieldValue( dest, item, 'event_' + event.type_id + '_date', event.date );
		}
	}
}


function FinalizeReportItem( dest, item )
{
	//lib_stat_v2.SetItemFieldValue( dest, item, 'viewed_candidate_count', lib_stat_v2.GetItemFieldValue( dest, item, 'resp_candidate_count' ) + lib_stat_v2.GetItemFieldValue( dest, item, 'active_search_candidate_count' ) + lib_stat_v2.GetItemFieldValue( dest, item, 'other_source_candidate_count' ) );
}