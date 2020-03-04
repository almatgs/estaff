function BuildReportItems( dest )
{
	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = candidates;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.creation_date = true;
	queryParam.dynFilters.state_id = true;
	queryParam.dynFilters.state_date = true;
	queryParam.dynFilters.user_id = true;
	queryParam.dynFilters.group_id = true;
	queryParam.filters = new Object;
	if ( dest.filter.vacancy_id.HasValue )
		queryParam.filters['spots.spot.vacancy_id'] = {'$in':[dest.filter.vacancy_id]};
	queryParam.xqueryFieldNames = ['fullname', 'source_id', 'entrance_type_id', 'spots'];

	vacancyIDArray = new Array;

	candidatesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( candidate in candidatesArray )
	{
		for ( spot in candidate.spots )
			vacancyIDArray.push( spot.vacancy_id );
	}

	vacancyIDArray = ArraySelectDistinct( vacancyIDArray );
	vacanciesArray = lib_stat_v2.QueryForeignArraySubset( dest, vacancies, vacancyIDArray, 'This', ['name'] );
	
	candidatesArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( candidate in candidatesArray )
	{
		if ( candidate.spots.ChildNum != 0 )
		{
			spotsArray = candidate.spots;
		}
		else
		{
			spotsArray = [{vacancy_id:null}];
		}

		for ( spot in spotsArray )
		{
			vacancy = undefined;
			if ( spot.vacancy_id != null )
				vacancy = ArrayOptFindByKey( vacanciesArray, spot.vacancy_id, 'id' );

			auxKeyData = new Object;
			if ( global_settings.use_candidate_spot_source && candidate.spots.ChildNum != 0 && spot.source_id.HasValue )
				auxKeyData.source_id = spot.source_id;
			else
				auxKeyData.source_id = candidate.source_id;

			if ( global_settings.use_candidate_spot_source && candidate.spots.ChildNum != 0 && spot.entrance_type_id.HasValue )
				auxKeyData.entrance_type_id = spot.entrance_type_id;
			else
				auxKeyData.entrance_type_id = candidate.entrance_type_id;

			for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, candidate, auxKeyData ) )
			{
				if ( vacancy != undefined )
					lib_stat_v2.SetItemFieldValue( dest, item, 'vacancy_name', vacancy.name );

				lib_stat_v2.SetItemFieldValue( dest, item, 'count', 1 );
			}
		}
	}
}


function FinalizeReportItem( dest, item )
{
	if ( item.groupSpecID == 'candidate_id' )
	{
		lib_stat_v2.SetItemFieldValue( dest, item, 'count', undefined );
		lib_stat_v2.SetItemFieldValue( dest, item, 'percent', undefined );
		return;
	}

	count = lib_stat_v2.GetItemFieldValue( dest, item, 'count' );

	for ( collectionName in lib_stat_v2.GetItemAllCollectionNames( dest, item ) )
	{
		if ( item[collectionName] == undefined )
			continue;

		for ( subItem in item[collectionName] )
		{
			subCount = lib_stat_v2.GetItemFieldValue( dest, subItem, 'count' );
			lib_stat_v2.SetItemFieldValue( dest, subItem, 'percent', ( subCount * 100 ) / count );
		}
	}
}

