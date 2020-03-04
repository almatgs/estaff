function InitStatSettingsForm( stat )
{
	//if ( ! stat.settings_screen_form_url.HasValue )
		//return;

	//stat.settings.ApplyFormElem( FetchForm( stat.settings_form_url ).TopElem );
	//DebugMsg( stat.settings.Xml );
}


function InitStatResult( dest )
{
	dest.spec.AssignElem( dest.stat_id.ForeignElem );

	if ( dest.spec.code_lib_url == '' && dest.spec.build_phases.ChildNum == 0 )
		throw UserError( 'Neither build phases nor script url have been specified' );

	dest.codeLib = undefined;
	dest.build_stages_num = dest.spec.build_phases.ChildNum;

	InitDefaultDateRangeFilters( dest );

	if ( dest.spec.code_lib_url != '' )
	{
		dest.codeLib = OpenCodeLib( dest.spec.code_lib_url );
		if ( dest.codeLib.PropertyExists( 'InitReport' ) )
			dest.codeLib.InitReport( dest );
	}

	for ( fieldSpec in ArraySelectAll( dest.spec.fields ) )
	{
		if ( fieldSpec.exist_req_expr.HasValue && ! eval( fieldSpec.exist_req_expr ) )
		{
			fieldSpec.Delete();
			continue;
		}

		if ( fieldSpec.auto_multiply_by_voc.HasValue )
			MultiplyFieldSpec( dest, fieldSpec );
	}

	dest.header_columns.Clear();

	for ( fieldSpec in ArraySelectAll( dest.spec.fields ) )
	{
		if ( fieldSpec.std_scenario_id.HasValue )
			InitFieldStdScenario( dest, fieldSpec );

		if ( ! fieldSpec.auto_calc.HasValue )
		{
			if ( ( fieldSpec.stat_func.HasValue && fieldSpec.src_object_type_id.HasValue ) || fieldSpec.expr.HasValue || fieldSpec.numerator_field_id.HasValue )
				fieldSpec.auto_calc = false;
			else if ( fieldSpec.value_expr.HasValue )
				fieldSpec.auto_calc = false;
			else
				fieldSpec.auto_calc = dest.spec.auto_calc_all_fields;
		}

		if ( fieldSpec.id.HasValue )
		{
			if ( ! fieldSpec.elem_name.HasValue && fieldSpec.auto_calc )
				fieldSpec.elem_name = fieldSpec.id;
		}
		else
		{
			if ( ! fieldSpec.elem_name.HasValue )
				throw UserError( 'Empty field ID' );

			fieldSpec.id = fieldSpec.elem_name;
			if ( fieldSpec.foreign_hier_level.HasValue )
				fieldSpec.id += '__level_' + fieldSpec.foreign_hier_level;
		}

		formElem = undefined;
		if ( ! fieldSpec.source_id.HasValue && ( fieldSpec.auto_calc || fieldSpec.value_expr.HasValue ) )
			fieldSpec.source_id = dest.spec.default_catalog_name;

		if ( fieldSpec.source_id.HasValue )
		{
			catalog = DefaultDb.GetOptCatalog( fieldSpec.source_id );
			formElem = catalog.Form.TopElem[0].OptChild( fieldSpec.elem_name );
			if ( formElem == undefined && fieldSpec.auto_calc )
				throw 'No such field: ' + fieldSpec.id;
		}

		/*if ( fieldSpec.foreign_array.HasValue )
		{
			catalog = DefaultDb.GetOptCatalog( fieldSpec.foreign_array );
			if ( catalog == undefined )
				throw UserError( 'No such catalog: ' + fieldSpec.foreign_array );

			formRecord = lib_base.get_catalog_form_record( catalog );
			if ( formRecord.PathExists( fieldSpec.id ) )
				formElem = formRecord.EvalPath( fieldSpec.id );
		}*/

		headerColumn = dest.header_columns.AddChild();

		//if ( elem != undefined )
			//headerColumn.elem_ref = elem;

		if ( fieldSpec.col_title.HasValue )
			headerColumn.title = fieldSpec.col_title;
		else if ( formElem != undefined && formElem.ColTitle != '' )
			headerColumn.title = formElem.ColTitle;
		else if ( formElem != undefined )
		{
			headerColumn.title = formElem.Title;
			if ( fieldSpec.foreign_hier_level.HasValue )
				headerColumn.title += ' (' + ( fieldSpec.foreign_hier_level + 1 ) + ')'
		}
			
		if ( ! fieldSpec.chart_title.HasValue )
		{
			if ( fieldSpec.col_title == 'Кол-во' && fieldSpec.span_title.HasValue ) // !!!
				fieldSpec.chart_title = fieldSpec.span_title;
			else if ( fieldSpec.col_title.HasValue )
				fieldSpec.chart_title = fieldSpec.col_title;
			else
				fieldSpec.chart_title = headerColumn.title;
		}

		if ( fieldSpec.tip_text.HasValue )
			headerColumn.tip_text = fieldSpec.tip_text;
		else if ( formElem != undefined && formElem.Title != headerColumn.title )
			headerColumn.tip_text = formElem.Title;

		if ( fieldSpec.data_type.HasValue )
			headerColumn.data_type = fieldSpec.data_type;
		else if ( formElem != undefined && formElem.ForeignArrayExpr == '' )
		{
			headerColumn.data_type = formElem.Type;
			fieldSpec.data_type = formElem.Type;
		}
		else if ( fieldSpec.stat_func.HasValue )
			headerColumn.data_type = 'integer';
		else if ( fieldSpec.is_percent )
			headerColumn.data_type = 'integer';

		if ( ! fieldSpec.disp_format.HasValue && formElem != undefined )
		{
			switch ( formElem.Name )
			{
				case 'mobile_phone':
					fieldSpec.disp_format = 'phone';
					break;
			}
		}
		
		if ( fieldSpec.width.HasValue )
		{
			headerColumn.width = fieldSpec.width;
		}
		else
		{
			if ( formElem != undefined && ( colLen = lib_base.get_field_default_col_len( formElem ) ) != null )
			{
				if ( fieldSpec.use_time )
					colLen += 6;

				if ( fieldSpec.time_only )
					colLen = 6;
			}
			else if ( fieldSpec.is_percent )
			{
				colLen = 5;
			}
			else if ( headerColumn.data_type == 'integer' )
			{
				colLen = 6;
			}
			else if ( headerColumn.data_type == 'date' )
			{
				colLen = 10;
			}
			else
			{
				colLen = 2;
			}

			if ( headerColumn.title != '' && ! fieldSpec.rotation.HasValue )
			{
				colTitleLen = StrLen( ArrayMax( String( UnifySpaces( headerColumn.title ) ).split( ' ' ), 'StrLen( This )' ) );
				colTitleLen += 2;
				if ( colLen < colTitleLen )
					colLen = colTitleLen;

				//alert( headerColumn.title + ' ' + colTitleLen + ' ' + colLen );
			}

			headerColumn.width = ( colLen + 1 ) + 'zr';
		}

		if ( fieldSpec.align.HasValue )
			headerColumn.align = fieldSpec.align;
		else if ( fieldSpec.is_percent )
			headerColumn.align = 'center';
		else if ( headerColumn.data_type == 'integer' && ( formElem == undefined || formElem.ForeignArrayExpr == '' || fieldSpec.stat_func.HasValue ) )
			headerColumn.align = 'right';
		else if ( headerColumn.data_type == 'real' )
			headerColumn.align = 'right';
		else if ( headerColumn.data_type == 'date' )
			headerColumn.align = 'center';

		if ( fieldSpec.rotation.HasValue && fieldSpec.rotation != 0 )
		{
			if ( fieldSpec.rotation != 90 )
				throw UserError( 'Invalid text rotation: ' + fieldSpec.rotation );

			headerColumn.use_vertical_text = true;
		}
	}


	dest.top_columns.Clear();

	if ( ArrayOptFind( dest.spec.fields, 'keep_to_prev' ) != undefined )
	{
		topColumn = undefined;

		for ( i = 0; i < dest.spec.fields.ChildNum; i++ )
		{
			fieldSpec = dest.spec.fields[i];

			if ( fieldSpec.keep_to_prev && topColumn != undefined )
			{
				topColumn.span++;
				continue;
			}

			topColumn = dest.top_columns.AddChild();

			if ( fieldSpec.span_title != '' )
			{
				topColumn.title = fieldSpec.span_title;
				topColumn.tip_text = fieldSpec.span_tip_text;
			}
			else
			{
				headerColumn = dest.header_columns[i];

				topColumn.title = headerColumn.title;
				topColumn.tip_text = headerColumn.tip_text;
				topColumn.use_vertical_text = headerColumn.use_vertical_text;

				headerColumn.title = '';
				headerColumn.tip_text = '';
				headerColumn.use_vertical_text = false;
			}
		}
	}
}


function InitFieldStdScenario( dest, fieldSpec )
{
	if ( fieldSpec.std_scenario_id == 'events_of_type_count' )
	{
		obj = StrOptScan( fieldSpec.id, '%s_count' );
		if ( obj == undefined )
			throw UserError( 'Invalid field id for a standard scenario: ' + fieldSpec.id );

		eventTypeID = obj[0];
		eventType = GetOptForeignElem( event_types, eventTypeID );
		if ( eventType == undefined )
			throw UserError( 'No such event type: ' + eventTypeID );
			
		if ( ! fieldSpec.col_title.HasValue )
			fieldSpec.col_title = eventType.name;

		fieldSpec.stat_func = 'count';
		fieldSpec.src_object_type_id = 'event';
		fieldSpec.stat_qual_part.operator = '==';
		fieldSpec.stat_qual_part.field_id = 'type_id';
		fieldSpec.stat_qual_part.value2 = eventTypeID;
	}
	else if ( fieldSpec.std_scenario_id == 'events_of_type_percent' )
	{
		obj = StrOptScan( fieldSpec.id, '%s_percent' );
		if ( obj == undefined )
			throw UserError( 'Invalid field id for a standard scenario: ' + fieldSpec.id );

		eventTypeID = obj[0];
		baseFieldID = eventTypeID + '_count';
		baseField = dest.spec.fields.GetOptChildByKey( baseFieldID );
		if ( baseField == undefined )
			throw UserError( 'No matching ' + baseFieldID + ' has been found' );

		match = false;
		for ( i = baseField.ChildIndex - 1; i >= 0; i-- )
		{
			prevFieldSpec = dest.spec.fields[i];
			if ( prevFieldSpec.stat_func == 'count' )
			{
				match = true;
				break;
			}
		}

		if ( ! match )
			throw UserError( 'Deniminator field is not found for : ' + fieldSpec.id );

		if ( ! fieldSpec.col_title.HasValue )
			fieldSpec.col_title = '%';
		
		fieldSpec.auto_calc = false;
		fieldSpec.is_percent = true;
		fieldSpec.numerator_field_id = eventTypeID + '_count';
		fieldSpec.denominator_field_id = prevFieldSpec.id;
		//fieldSpec.width = '9zr';
		//<align>center</align>
	}
	else
	{
		throw UserError( 'Unknown standard field scenario: ' + fieldSpec.std_scenario_id );
	}
}


function InitDefaultDateRangeFilters( dest )
{
	for ( dynFilterSpec in dest.spec.dyn_filters )
	{
		if ( dynFilterSpec.data_type == 'date' && dynFilterSpec.use_range )
		{
			minDateElem = dest.filter.Child( 'min_' + dynFilterSpec.id );
			maxDateElem = dest.filter.Child( 'max_' + dynFilterSpec.id );

			if ( ! minDateElem.HasValue && ! maxDateElem.HasValue )
			{
				period = lib_stat_v2.CalcFilterPeriod( dynFilterSpec.default_period );
				minDateElem.Value = period.startDate;
				maxDateElem.Value = period.endDate;
			}
		}
	}
}


function MultiplyFieldSpec( dest, sampleFieldSpec )
{
	index = sampleFieldSpec.ChildIndex;
	count = 0;

	for ( elem in lib_voc.get_sorted_voc( lib_voc.get_voc_by_id( sampleFieldSpec.auto_multiply_by_voc ) ) )
	{
		fieldSpec = dest.spec.fields.InsertChild( index );
		fieldSpec.AssignElem( sampleFieldSpec );
		fieldSpec.id = StrReplaceOne( sampleFieldSpec.id, 'xxx', elem.id );
		fieldSpec.col_title = elem.name;
		fieldSpec.numerator_field_id = StrReplaceOne( sampleFieldSpec.numerator_field_id, 'xxx', elem.id );

		if ( count != 0 )
		{
			fieldSpec.keep_to_prev = true;
			fieldSpec.span_title.Clear();
		}

		index++;
		count++;
	}

	sampleFieldSpec.Delete();
}


function CalcStatResult( dest )
{
	//lib_base.check_desktop_client();
	runOnServer = false;

	if ( System.IsWebClient )
		runOnServer = true;

	InitDefaultDateRangeFilters( dest );

	if ( runOnServer )
	{
		task = new BackgroundTask;
		task.RunOnServer = true;
		task.ShowProgress = true;

		if (dest.build_stages_num > 1)
			task.MaxProgressLevels = 2;

		//DebugMsg( dest.spec.groups.Xml );
		//DebugMsg( dest.spec.CloneWithoutForm().groups.Xml );

		dest2 = new Object;
		dest2.spec = dest.spec.CloneWithoutForm();
		dest2.filter = dest.filter.CloneWithoutForm();
		dest2.header_columns = dest.header_columns.CloneWithoutForm();

		respData = task.CallMethod( 'lib_stat_v2', 'CalcStatResultCoreSrv', [dest2] );
		//dest.AssignElem( respData );

		dest.rootItem = respData.rootItem;
		dest.footerItems = respData.footerItems;
		dest.filter.AssignElem( respData.filter );

		AdjustGroupColors( dest );
	}
	else
	{
		task = new BackgroundTask;
		task.ShowProgress = true;

		if (dest.build_stages_num > 1)
			task.MaxProgressLevels = 2;

		task.CallMethod( 'lib_stat_v2', 'CalcStatResultCore', [dest] );
	}

	if ( dest.sub_selector == 'chart' && ( hyper = dest.Doc.Screen.FindOptItem( 'ChartHyper' ) ) != undefined )
	{
		BuildChart( dest );
		UpdateChartHyper( dest, hyper );
	}
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function CalcStatResultCoreSrv( dest2 )
{
	//dest = CreateElem( 'base1_general_stat.xmd', 'stat_result_v2' );

	statID = dest2.spec.id;
	param = lib_stat.build_stat_param( statID );
	form = CreateFormFromStr( '<SPXML-FORM><generic_view></generic_view></SPXML-FORM>' );
	lib_stat.build_form( param, form );

	dest = CreateElemByFormElem( form.TopElem );

	dest.spec.AssignElem( dest2.spec );
	dest.stat_id = dest.spec.id;

	dest.filter.AssignElem( dest2.filter );
	dest.header_columns.AssignElem( dest2.header_columns );

	CalcStatResultCore( dest );

	respData = new Object;
	respData.rootItem = dest.rootItem;
	respData.footerItems = dest.footerItems;
	respData.filter = dest.filter.CloneWithoutForm();
	return respData;
}


function CalcStatResultCore(dest)
{
	dest.progress = new TaskProgress;
	dest.progress.TaskName = UiText.messages.building_report + '...';

	if ( dest.build_stages_num > 1 )
	{
		dest.progress.ItemCount = dest.build_stages_num;
		dest.progress.CurrentItemIndex = 0;

		dest.innerProgress = new TaskProgress;
	}

	dest.spec.groups.AssignElem( dest.stat_id.ForeignElem.groups ); // Temp fix

	for ( groupSpec in ArraySelectAll( dest.spec.groups ) )
	{
		if ( groupSpec.exist_req_expr.HasValue && ! eval( groupSpec.exist_req_expr ) )
		{
			groupSpec.Delete();
			continue;
		}
	}

	if ( dest.spec.code_lib_url != '' )
		dest.codeLib = OpenCodeLib( dest.spec.code_lib_url );

	dest.rootItem = CreateItem();
	dest.postHeaderItems = undefined;
	dest.footerItems = undefined;
	dest.idataKeysCache = undefined;

	if ( dest.codeLib != undefined && dest.codeLib.PropertyExists( 'BuildReportStart' ) )
		dest.codeLib.BuildReportStart( dest );

	AdjustGroups( dest );
	AdjustGroupsByDynFilters( dest );
	AdjustGroupColors( dest );

	cur_build_stage_index = 0;
	dest.phasesResults = new Array;
	
	if ( dest.codeLib != undefined && dest.codeLib.PropertyExists( 'PrepareReportItems' ) )
		dest.codeLib.PrepareReportItems( dest );

	for ( buildPhase in dest.spec.build_phases )
		ProcessBuildPhase( dest, buildPhase );

	if ( dest.codeLib != undefined )
		dest.codeLib.BuildReportItems( dest );

	AdjustItemOrder( dest, dest.rootItem );
	CalcItemSumValues( dest, dest.rootItem );
	FinalizeItem( dest, dest.rootItem );

	if ( dest.codeLib != undefined && dest.codeLib.PropertyExists( 'BuildReportFinish' ) )
		dest.codeLib.BuildReportFinish( dest );

	PutUrlData( 'x-local://Logs/zz_stat.json', EncodeJson( dest.rootItem, {PrettyFormat:false} ) );
	if ( dest.footerItems != undefined )
		PutUrlData( 'x-local://Logs/zz_stat_footer.json', EncodeJson( dest.footerItems, {PrettyFormat:false} ) );
}


function AdjustGroups( dest )
{
	curLevel = 0;

	for ( groupSpec in dest.spec.groups )
	{
		if ( groupSpec.group_level.HasValue )
			curLevel = groupSpec.group_level;
		else
			groupSpec.group_level = curLevel;

		curLevel++;

		if ( ! groupSpec.start_hier_level.HasValue )
			groupSpec.start_hier_level = 0;

		if ( ! groupSpec.disp_name_field_id.HasValue )
		{
			if ( dest.spec.fields.ChildByKeyExists( groupSpec.id ) )
				groupSpec.disp_name_field_id = groupSpec.id;
			//else if ( groupSpec.ChildIndex != dest.spec.groups.ChildNum - 1 )
				//groupSpec.disp_name_field_id = dest.spec.fields[0].id;
		}
	}

	dest.group_levels_num = curLevel;
}


function AdjustGroupsByDynFilters( dest )
{
	for ( groupSpec in dest.spec.groups )
	{
		dynFilterSpec = dest.spec.dyn_filters.GetOptChildByKey( groupSpec.id );
		if ( dynFilterSpec == undefined || dynFilterSpec.foreign_array != groupSpec.foreign_array )
			continue;

		AdjustGroupByDynFilters( dest, groupSpec, dynFilterSpec );
	}
}


function AdjustGroupColors( dest )
{
	if ( ! dest.spec.use_group_bk_colors )
		return;

	for ( groupSpec in dest.spec.groups )
	{
		if ( groupSpec.bk_color.HasValue )
			continue;

		switch ( dest.spec.groups.ChildNum - 1 - groupSpec.ChildIndex )
		{
			case 1:
				groupSpec.bk_color = '203,233,248';
				break;

			case 2:
				groupSpec.bk_color = '153,211,240';
				break;
		}
	}

	if ( dest.spec.groups.ChildNum > 1 && ArrayOptFind( dest.spec.groups, 'bold' ) == undefined && dest.spec.groups[0].foreign_array != dest.spec.default_catalog_name )
	{
		dest.spec.groups[0].bold = true;
	}
}


function AdjustGroupByDynFilters( dest, groupSpec, dynFilterSpec )
{
	if ( dynFilterSpec.is_multiple )
	{
		filterElem = GetObjectProperty( dest.filter, dynFilterSpec.id );
		if ( ! filterElem.HasValue )
			return;

		if ( groupSpec.is_hier )
		{
			catalog = DefaultDb.GetOptCatalog( dynFilterSpec.foreign_array );

			array = ArrayExtract( filterElem, 'lib_base.get_hier_chain( catalog, This ).length' );
			hierLevel = ArrayMin( array ) - 1;
		}
	}
	else
	{
		filterElem = dest.filter.Child( dynFilterSpec.id );
		if ( ! filterElem.HasValue )
			return;

		if ( groupSpec.is_hier )
		{
			catalog = DefaultDb.GetOptCatalog( dynFilterSpec.foreign_array );
			hierLevel = lib_base.get_hier_chain( catalog, filterElem ).length - 1;
		}
	}

	if ( groupSpec.is_hier && hierLevel > 0 )
		groupSpec.start_hier_level = hierLevel;

	groupSpec.is_range_restricted = true;
}


function ProcessBuildPhase( dest, buildPhase )
{
	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.filters = new Object;

	param = new Object;

	if ( buildPhase.std_scenario_id == '' )
	{
		if ( ! buildPhase.catalog_name.HasValue )
			throw UserError( 'Source catalog has not been specified' );
	
		queryParam.catalog = DefaultDb.GetOptCatalog( buildPhase.catalog_name );
	}
	else if ( buildPhase.std_scenario_id == 'vacancies_in_time_period' )
	{
		buildPhase.catalog_name = 'vacancies';

		queryParam.catalog = vacancies;
		queryParam.filters['$dateRangeIntersects'] = ['start_date', 'deactivate_date', dest.filter.min_date, dest.filter.max_date];

		//queryParam.xqueryFieldNames = ['spots', 'main_vacancy_id'];
	}
	else if ( buildPhase.std_scenario_id == 'candidates_of_vacancies' )
	{
		buildPhase.catalog_name = 'candidates';
		param.prevPhaseResult = FindPrevPhaseResultByCatalogName( dest, 'vacancies' );

		queryParam.catalog = candidates;
		queryParam.filters['spots.spot.vacancy_id'] = {'$in':ArrayExtract( param.prevPhaseResult.array, 'id' )};

		queryParam.xqueryFieldNames = ['spots', 'main_vacancy_id'];
	}
	else if ( buildPhase.std_scenario_id == 'events_of_candidates' )
	{
		buildPhase.catalog_name = 'events';
		param.prevPhaseResult = FindPrevPhaseResultByCatalogName( dest, 'candidates' );

		queryParam.catalog = events;
		
		if ( ArrayOptFind( buildPhase.quals, 'field_id == "date" && dyn_filter_id == "date"' ) == undefined )
		{
			if ( dest.filter.ChildExists( 'min_date' ) )
				queryParam.filters.date = {'$gte':dest.filter.min_date};
			else
				queryParam.filters.date = {'$gte':DateOffset( DateNewTime( CurDate ), 0 - 86400 * 60 )};
		}
		
		typeIDs = new Array;

		for ( fieldSpec in dest.spec.fields )
		{
			if ( ! fieldSpec.stat_func.HasValue || fieldSpec.src_object_type_id != 'event' )
				continue;

			if ( fieldSpec.stat_qual_part.operator == '==' && fieldSpec.stat_qual_part.field_id == 'type_id' )
				typeIDs.push( fieldSpec.stat_qual_part.value2 );
		}

		if ( typeIDs.length != 0 )
			queryParam.filters.type_id = {'$in':typeIDs};
		
		queryParam.xqueryFieldNames = ['candidate_id','vacancy_id'];
	}
	else
	{
		throw UserError( 'Unknown built-in phase scenario: ' + buildPhase.std_scenario_id );
	}
	
	if ( buildPhase.filters_json.HasValue )
		queryParam.filters = ParseJson( buildPhase.filters_json );
	
	for ( qual in buildPhase.quals )
	{
		if ( qual.predicate == '$dateRangeIntersects' )
		{
			if ( ! qual.min_field_id.HasValue )
				throw 'qual.min_field_id is empty';

			if ( ! qual.max_field_id.HasValue )
				throw 'qual.max_field_id is empty';

			if ( ! qual.dyn_filter_id.HasValue )
				throw 'qual.dyn_filter_id is empty';

			queryParam.filters['$dateRangeIntersects'] = [qual.min_field_id, qual.max_field_id, dest.filter.Child( 'min_' + qual.dyn_filter_id ), dest.filter.Child( 'max_' + qual.dyn_filter_id )];
		}
		else if ( qual.predicate.HasValue )
		{
			throw 'Unknown predicate: ' + qual.predicate;
		}
		else if ( qual.dyn_filter_id.HasValue && qual.field_id.HasValue )
		{
			if ( queryParam.dynFilters == undefined )
				queryParam.dynFilters = new Object;
			
			queryParam.dynFilters[qual.dyn_filter_id] = {fieldID:qual.field_id};
		}
	}
	
	for ( dynFilterSpec in dest.spec.dyn_filters )
	{
		if ( dynFilterSpec.source_id == buildPhase.catalog_name )
		{
			if ( queryParam.dynFilters == undefined )
				queryParam.dynFilters = new Object;

			queryParam.dynFilters[dynFilterSpec.id] = true;
		}
	}

	if ( buildPhase.catalog_name == 'events' && buildPhase.exclude_scheduled_events )
	{
		if ( queryParam.xqueryQuals == undefined )
			queryParam.xqueryQuals = new Array;

		queryParam.xqueryQuals.push( '$elem/occurrence_id != "scheduled"' );
	}

	if ( buildPhase.catalog_name == 'events' && buildPhase.exclude_cancelled_events )
	{
		if ( queryParam.xqueryQuals == undefined )
			queryParam.xqueryQuals = new Array;

		queryParam.xqueryQuals.push( '$elem/occurrence_id != "cancelled"' );
	}

	for ( name in buildPhase.xquery_field_names )
	{
		if ( queryParam.xqueryFieldNames == undefined )
			queryParam.xqueryFieldNames = new Array;

		queryParam.xqueryFieldNames.ObtainByValue( name );
	}

	param.explicitRecordGroup = dest.spec.groups.GetOptChildByKey( buildPhase.catalog_name, 'foreign_array' );

	array = lib_stat_v2.ExecQueryParam( dest, queryParam );
	
	isProcessed = false;
	if ( dest.codeLib != undefined && dest.codeLib.PropertyExists( 'ProcessPhaseRecords' ) )
		isProcessed = dest.codeLib.ProcessPhaseRecords( dest, buildPhase, param, array );

	if ( ! isProcessed )
	{
		for ( record in array )
			ProcessPhaseRecord( dest, buildPhase, record, param );
	}

	phaseResult = new Object;
	phaseResult.catalogName = queryParam.catalog.Name;
	phaseResult.array = ArraySort( array, 'id', '+' );
	dest.phasesResults.push( phaseResult );
}


function ProcessPhaseRecord( dest, buildPhase, record, param )
{
	if ( buildPhase.std_scenario_id == '' )
	{
		ProcessPhaseRecordCore( dest, buildPhase, record, param );
	}
	else if ( buildPhase.std_scenario_id == 'vacancies_in_time_period' )
	{
		ProcessPhaseRecordCore( dest, buildPhase, record, param );
	}
	else if ( buildPhase.std_scenario_id == 'candidates_of_vacancies' )
	{
		spotsArray = record.spots;
		param.explicitRecordGroup = undefined;

		for ( spot in spotsArray )
		{
			if ( spot.vacancy_id != null && ArrayOptFindByKey( param.prevPhaseResult.array, spot.vacancy_id, 'id' ) == undefined )
				continue;

			ProcessPhaseRecordCore( dest, buildPhase, record, param, {vacancy_id:spot.vacancy_id} );
		}
	}
	else if ( buildPhase.std_scenario_id == 'events_of_candidates' )
	{
		event = record;
		candidatesArray = param.prevPhaseResult.array;

		if ( buildPhase.exclude_scheduled_events && event.occurrence_id == 'scheduled' )
			return;

		if ( buildPhase.exclude_cancelled_events && event.occurrence_id == 'cancelled' )
			return;

		candidate = ArrayOptFindBySortedKey( candidatesArray, event.candidate_id, 'id' );
		if ( candidate == undefined )
			return;

		auxKeyData = new Object;

		if ( event.vacancy_id.HasValue )
			auxKeyData.vacancy_id = event.vacancy_id;
		else
			auxKeyData.vacancy_id = candidate.main_vacancy_id;

		ProcessPhaseRecordCore( dest, buildPhase, record, param, auxKeyData );
	}
}


function ProcessPhaseRecordCore( dest, buildPhase, record, param, auxKeyData )
{
	if ( param.explicitRecordGroup != undefined )
	{
		item = lib_stat_v2.AddExplicitRecordGroupItem( dest, record, param.explicitRecordGroup.id, auxKeyData );
	}
	else
	{
		if ( dest.spec.id == 'soglasie_stat_01' && dest.spec.default_catalog_name.HasValue && dest.spec.groups.GetOptChildByKey( dest.spec.default_catalog_name, 'foreign_array' ) != undefined ) // !!!
		{
			item = lib_stat_v2.FindRecordGroupItemBySingleKey( dest, record, auxKeyData );
			if ( item == undefined )
			{
				DebugMsg( 'FindRecordGroupItemBySingleKey() failed' );
				return;
			}

			ProcessPhaseRecordFields( dest, buildPhase, record, param, item );
		}
		else
		{
			for ( item in lib_stat_v2.ObtainRecordGroupItems( dest, record, auxKeyData ) )
			{
				ProcessPhaseRecordFields( dest, buildPhase, record, param, item );

				/*for ( destStatField in buildPhase.dest_stat_fields )
				{
					if ( destStatField.stat_value_prop_name.HasValue )
					{
					}
					else
					{
						lib_stat_v2.AddItemFieldSourceRecord( dest, item, destStatField.field_id, record );
					}
				}*/
			}
		}
	}
}


function ProcessPhaseRecordFields( dest, buildPhase, record, param, item )
{
	objectTypeID = record.Name;
	catalogName = lib_base.object_name_to_catalog_name( record.Name );

	for ( fieldSpec in dest.spec.fields )
	{
		if ( fieldSpec.stat_func.HasValue && fieldSpec.src_object_type_id == objectTypeID )
		{
			if ( ! CheckRecordStatQual( dest, record, item, fieldSpec ) )
				continue;

			lib_stat_v2.AddItemFieldSourceRecord( dest, item, fieldSpec.id, record );
		}
		else if ( fieldSpec.join_func.HasValue && fieldSpec.source_id == catalogName )
		{
			CalcField( dest, item, fieldSpec, record );
			//DebugMsg( 11 );
			//SetItemFieldValue( dest, item, fieldSpec.id, '--' );
			//item.fields[fieldSpec.id].title = '11';
		}
	}
}


function CheckRecordStatQual( dest, record, item, fieldSpec )
{
	match = false;

	if ( fieldSpec.stat_qual_part.operator.HasValue )
	{
		if ( ! CheckRecordStatQualPart( dest, record, item, fieldSpec, fieldSpec.stat_qual_part ) )
			return false;

		match = true;
	}
	
	if ( fieldSpec.stat_qual.HasValue )
	{
		match2 = SafeEval( fieldSpec.stat_qual, [record, dest] );
		if ( ! match2 )
			return false;

		match = true;
	}

	//return true; !!!
	return match;
}


function CheckRecordStatQualPart( dest, record, item, fieldSpec, qualPart )
{
	if ( qualPart.operator != '==' )
		throw UserError( 'Unknown stat qual operator: ' + qualPart.operator );
	
	field = record.Child( qualPart.field_id );
	value2 = qualPart.value2;

	return ( field.Value == value2 );
}


function FindPrevPhaseResultByCatalogName( dest, catalogName )
{
	phaseResult = ArrayOptFindByKey( dest.phasesResults, catalogName, 'catalogName' );
	if ( phaseResult == undefined )
		throw UserError( 'No previous phase result was found for catalog "' + catalogName + '"' );

	return phaseResult;
}




function CreateItem()
{
	item = new Object;
	item.SetStrictMode( false );

	item.fields = new Object;
	item.fields.SetStrictMode( false );

	return item;
}


function CreateItemField( dest, item, fieldID )
{
	if ( dest.spec.fields.GetOptChildByKey( fieldID ) == undefined )
		throw UserError( 'No such field: ' + fieldID );

	//if ( item.fields == undefined )
		//item.fields = new Object;

	if ( item.fields[fieldID] != undefined )
		return item.fields[fieldID];

	field = new Object;
	field.SetStrictMode( false );
	item.fields[fieldID] = field;
	return field;
}


function GetItemFieldValue( dest, item, fieldID )
{
	if ( ( fieldSpec = dest.spec.fields.GetOptChildByKey( fieldID ) ) == undefined )
		throw UserError( 'No such field: ' + fieldID );

	if ( item.fields[fieldID] != undefined && item.fields[fieldID].value != undefined )
		return item.fields[fieldID].value;

	if ( fieldSpec.data_type == 'integer' || fieldSpec.stat_func.HasValue )
		return 0;

	return '';
}


function SetItemFieldValue( dest, item, fieldID, fielValue )
{
	CreateItemField( dest, item, fieldID ).value = fielValue;
}


function CreateQueryParam()
{
	queryParam = new Object;
	queryParam.SetStrictMode( false );
	return queryParam;
}


function ExecQueryParam( dest, queryParam )
{
	queryStr = 'for $elem in ' + queryParam.catalog.Name;
	qual = '';

	if ( queryParam.dynFilters != undefined )
	{
		for ( dynFilterID in queryParam.dynFilters )
		{
			dynFilter = queryParam.dynFilters[dynFilterID];
			if ( DataType( dynFilter ) == 'object' && ( fieldID = dynFilter.GetOptProperty( 'fieldID' ) ) != undefined )
			{
			}
			else
			{
				fieldID = dynFilterID;
			}

			dynFilterSpec = dest.spec.dyn_filters.GetOptChildByKey( dynFilterID );
			if ( dynFilterSpec == undefined )
			{
				//throw 'No such dynamic filter: ' + dynFilterID;
				continue;
			}

			if ( dynFilterSpec.use_range )
			{
				filterElem = dest.filter.Child( 'min_' + dynFilterID );
				if ( filterElem.HasValue )
					qual += ' and $elem/' + fieldID + ' >= ' + filterElem.XQueryLiteral;

				filterElem = dest.filter.Child( 'max_' + dynFilterID );
				if ( filterElem.HasValue )
					qual += ' and $elem/' + fieldID + ' <= ' + XQueryLiteral( DateNewTime( filterElem, 23, 59, 59 ) );
			}
			else if ( dynFilterSpec.is_multiple )
			{
				filterElem = GetOptObjectProperty( dest.filter, dynFilterID );
				if ( filterElem == undefined || ! filterElem.HasValue )
					continue;

				if ( dynFilterSpec.use_idata )
				{
					idataKeys = ArrayExpand( filterElem, 'ObtainIdataKeys( dest, DefaultDb.GetOptCatalog( dynFilterSpec.foreign_array ), This )' );
					qual += ' and MatchSome( $elem/' + fieldID + ', (' + ArrayMerge( idataKeys, 'XQueryLiteral( This )', ','  ) + ') )';
				}
				else
				{
					qual += ' and MatchSome( $elem/' + fieldID + ', ' + filterElem.XQueryLiteral + ' )';
				}
			}
			else
			{
				filterElem = dest.filter.Child( dynFilterID );
				if ( ! filterElem.HasValue )
					continue;

				if ( dynFilterSpec.use_idata )
				{
					idataKeys = ObtainIdataKeys( dest, DefaultDb.GetOptCatalog( dynFilterSpec.foreign_array ), filterElem );
					qual += ' and MatchSome( $elem/' + fieldID + ', (' + ArrayMerge( idataKeys, 'XQueryLiteral( This )', ','  ) + ') )';
				}
				else
				{
					qual += ' and $elem/' + fieldID + ' = ' + filterElem.XQueryLiteral;
				}
			}
		}
	}
	
	if ( queryParam.filters != undefined )
	{
		for ( filterID in queryParam.filters )
		{
			filter = queryParam.filters[filterID];

			if ( filterID == '$dateRangeContains' )
			{
				qual += ' and $elem/' + filter[0] + ' < ' + XQueryLiteral( filter[2] );
				qual += ' and ( $elem/' + filter[1] + ' = null() or $elem/' + filter[1] + ' >= ' + XQueryLiteral( filter[2] ) + ' )';
			}
			else if ( filterID == '$dateRangeIntersects' )
			{
				minDate = filter[2];
				maxDate = filter[3];

				if ( maxDate != null )
					qual += ' and $elem/' + filter[0] + ' < ' + XQueryLiteral( DateNewTime( maxDate, 23, 59, 59 ) );
				
				if ( minDate != null )
					qual += ' and ( $elem/' + filter[1] + ' = null() or $elem/' + filter[1] + ' >= ' + XQueryLiteral( minDate ) + ' )';
			}
			else if ( ObjectType( filter ) == 'JsObject' )
			{
				for ( propName in filter )
				{
					prop = filter[propName];

					if ( propName == '$gte' )
					{
						qual += ' and $elem/' + filterID + ' >= ' + XQueryLiteral( prop );
					}
					else if ( propName == '$in' )
					{
						qual += ' and MatchSome( $elem/' + StrReplace( filterID, '.', '/' ) + ', (' + ArrayMerge( prop, 'XQueryLiteral( This )', ',' ) + ') )';
					}
					else if ( propName == '$inDateRange' )
					{
						minDate = prop[0];
						maxDate = prop[1];
					
						if ( minDate != null )
							qual += ' and $elem/' + filterID + ' >= ' + XQueryLiteral( minDate );
					
						if ( maxDate != null )
							qual += ' and $elem/' + filterID + ' <= ' + XQueryLiteral( DateNewTime( maxDate, 23, 59, 59 ) );
					}
					else
					{
						throw 'Unknown query operator: ' + propName;
					}
				}
			}
			else
			{
				qual += ' and $elem/' + filterID + ' = ' + XQueryLiteral( filter );
			}
		}
	}

	if ( queryParam.xqueryQuals != undefined )
	{
		for ( subQual in queryParam.xqueryQuals )
		{
			qual += ' and ';
			
			if ( StrContains( subQual, ' or ' ) )
				qual += '( ' + subQual + ' )';
			else
				qual += subQual;
		}
	}

	queryStr += StrReplaceOne( qual, ' and ', ' where ' );

	xqueryFieldNames = queryParam.xqueryFieldNames;

	if ( xqueryFieldNames == undefined )
		xqueryFieldNames = new Array;
	
	recordFormElem = queryParam.catalog.Form.TopElem.Child( 0 );

	for ( formElem in recordFormElem )
	{
		switch ( formElem.Name )
		{
			case 'id':
				xqueryFieldNames.push( formElem.Name );
				break;

			default:
				if ( dest.spec.groups.GetOptChildByKey( formElem.Name ) != undefined )
					xqueryFieldNames.push( formElem.Name );
		}
	}

	for ( fieldSpec in dest.spec.fields )
	{
		if ( fieldSpec.auto_calc && fieldSpec.source_id == queryParam.catalog.Name )
		{
			if ( xqueryFieldNames.indexOf( fieldSpec.elem_name ) < 0 )
				xqueryFieldNames.push( fieldSpec.elem_name );
		}
	}

	queryStr += ' return $elem/Fields( ' + ArrayMerge( xqueryFieldNames, 'XQueryLiteral( This )', ', ' ) + ' )';

	//DebugMsg( queryStr );
	array = XQuery( queryStr );

	if ( dest.build_stages_num > 1 )
	{
		dest.progress.CurrentItemIndex++;

		dest.innerProgress.ItemCount = ArrayCount( array );
		dest.innerProgress.CurrentItemIndex = 0;
	}

	return array;
}


function QueryForeignArraySubset( dest, catalog, srcArray, srcKeyName, xqueryFieldNames )
{
	keyValArray = ArraySelectDistinct( ArraySelect( ArrayExtract( srcArray, srcKeyName ), 'This.HasValue' ) );
	return QueryRecordsByIDs( dest, catalog, keyValArray, xqueryFieldNames );
}


function QueryRecordsByIDs( dest, catalog, keyValArray, xqueryFieldNames )
{
	pageSize = 200;
	pagesNum = ( keyValArray.length + pageSize - 1 ) / pageSize;

	array = new Array;
	if ( pagesNum == 0 )
		return array;

	for ( pageIndex = 0; pageIndex < pagesNum; pageIndex++ )
	{
		subKeyValArray = ArrayRange( keyValArray, pageIndex * pageSize, pageSize );
	
		queryStr = 'for $elem in ' + catalog.Name;
		queryStr += ' where MatchSome( $elem/id, (' + ArrayMerge( subKeyValArray, 'XQueryLiteral( This )', ',' ) + ' ) )';
		
		if ( pagesNum == 1 )
			queryStr += ' order by $elem/id';

		if ( xqueryFieldNames != undefined )
		{
			if ( xqueryFieldNames.indexOf( 'id' ) < 0 )
				xqueryFieldNames.push( 'id' );
		}
		else
		{
			xqueryFieldNames = new Array;
	
			recordFormElem = catalog.Form.TopElem.Child( 0 );

			for ( formElem in recordFormElem )
			{
				switch ( formElem.Name )
				{
					case 'id':
						xqueryFieldNames.push( formElem.Name );
						break;

					default:
						if ( dest.spec.groups.GetOptChildByKey( formElem.Name ) != undefined )
							xqueryFieldNames.push( formElem.Name );
				}
			}
		}

		queryStr += ' return $elem/Fields( ' + ArrayMerge( xqueryFieldNames, 'XQueryLiteral( This )', ', ' ) + ' )';

		subArray = XQuery( queryStr );
		if ( pagesNum == 1 )
			return subArray;

		array.AddArray( subArray );
	}

	array = ArraySelectDistinct( array, 'id' );
	array = ArraySort( array, 'id', '+' );
	return array;
}


function ObtainIdataKeys( dest, catalog, baseKeyVal )
{
	if ( dest.idataKeysCache == undefined )
	{
		dest.idataKeysCache = new Object;
		dest.idataKeysCache.SetStrictMode( false );
	}

	cacheKey = catalog.Name + ':' + XQueryLiteral( baseKeyVal );
	if ( ( array = dest.idataKeysCache[cacheKey] ) != undefined )
		return array;
		
	queryStr = 'for $elem in ' + catalog.Name;
	queryStr += ' where IsHierChildOrSelf( $elem/id, ' + XQueryLiteral( baseKeyVal ) + ' )'
	queryStr += ' order by $elem/Hier()';
	queryStr += ' return $elem/Fields( \'id\' )';

	array = XQuery( queryStr );
	array = ArrayExtract( array, 'id' );

	dest.idataKeysCache[cacheKey] = array;
	return array;
}



function ObtainRecordGroupItem( dest, record, auxKeyData, maxGroupLevelsNum )
{
	items = ObtainRecordGroupItems( dest, record, auxKeyData, maxGroupLevelsNum );
	return items[items.length - 1];
}


function ObtainRecordGroupItems( dest, record, auxKeyData, maxGroupLevelsNum )
{
	if ( dest.build_stages_num > 1 )
	{
		dest.innerProgress.CurrentItemIndex++;

		if ( dest.innerProgress.CurrentItemIndex >= dest.innerProgress.ItemCount )
			dest.innerProgress.ItemCount++;
	}

	if ( maxGroupLevelsNum == undefined )
		maxGroupLevelsNum = dest.group_levels_num;

	baseItemsArray = [dest.rootItem];

	for ( groupLevel = 0; groupLevel < maxGroupLevelsNum; groupLevel++ )
	{
		baseItemsArray = ObtainRecordGroupLevelItems( dest, record, auxKeyData, groupLevel, baseItemsArray )
	}

	return baseItemsArray;
}


function ObtainRecordGroupLevelItems( dest, record, auxKeyData, groupLevel, baseItemsArray )
{
	destItems = new Array;
	
	for ( baseItem in baseItemsArray )
	{
		for ( groupSpec in ArraySelectByKey( dest.spec.groups, groupLevel, 'group_level' ) )
		{
			curBaseItem = baseItem;
			isExplicitGroupRecord = false;

			if ( auxKeyData != undefined && auxKeyData.HasProperty( groupSpec.id ) )
			{
				keyVal = auxKeyData[groupSpec.id];
			}
			else if ( groupSpec.id == record.Name + '_id' )
			{
				keyVal = record.id;
				isExplicitGroupRecord = true;
			}
			else if ( record.PropertyExists( groupSpec.id ) )
			{
				keyVal = GetObjectProperty( record, groupSpec.id );
			}
			else
			{
				keyVal = record.OptChild( groupSpec.id );
				if ( keyVal == undefined )
					throw UserError( 'Unable to bind <' + record.Name + '> record to "' + groupSpec.id + '" group. No key provided.' );
			}

			foreignArray = DefaultDb.GetOptCatalog( groupSpec.foreign_array );
			if ( foreignArray == undefined )
				foreignArray = eval( groupSpec.foreign_array );

			if ( groupSpec.is_hier )
			{
				keyValArray = ArrayExtract( lib_base.get_hier_desc_chain( foreignArray, keyVal ), 'id' );
				if ( groupSpec.start_hier_level > 0 )
					curParentKeyVal = keyValArray[groupSpec.start_hier_level - 1];
				else
					curParentKeyVal = null;
				
				if ( groupSpec.max_hier_level.HasValue )
					keyValArray = ArrayRange( keyValArray, groupSpec.start_hier_level, groupSpec.max_hier_level );
				else if ( groupSpec.start_hier_level.HasValue )
					keyValArray = ArrayRange( keyValArray, groupSpec.start_hier_level, 999 );
			}
			else
			{
				curParentKeyVal = undefined;
			}

			if ( ! groupSpec.is_hier || keyValArray.length == 0 )
				keyValArray = [keyVal];

			collectionName = GetGroupCollectionName( dest, groupSpec );

			i = 0;

			for ( curKeyVal in keyValArray )
			{
				if ( curBaseItem[collectionName] == undefined )
				{
					curBaseItem[collectionName] = new Array;

					if ( groupSpec.show_full_range && ! ( groupSpec.is_range_restricted && i == 0 ) )
						BuildGroupItemFullRange( dest, groupSpec, curBaseItem, foreignArray, curParentKeyVal );
				}

				item = ArrayOptFindByKey( curBaseItem[collectionName], curKeyVal, 'keyVal' );
				if ( item == undefined )
				{
					item = CreateItem();
					curBaseItem[collectionName].push( item );
					
					//if ( dest.spec.groups.ChildNum > 1 )
						item.groupSpecID = groupSpec.id;
					
					item.keyVal = curKeyVal;
					InitGroupItemFields( dest, item );
				}

				curBaseItem = item;
				curParentKeyVal = curKeyVal;
				i++;
			}

			destItems.push( item );
		}
	}

	return destItems;
}


function FindRecordGroupItemBySingleKey( dest, record, auxKeyData )
{
	isExplicitGroupRecord = false;
	keyVal = undefined;

	for ( groupSpec in dest.spec.groups )
	{
		isExplicitGroupRecord = false;
		if ( groupSpec.foreign_array != dest.spec.default_catalog_name )
			continue;

		if ( auxKeyData != undefined && auxKeyData.HasProperty( groupSpec.id ) )
		{
			keyVal = auxKeyData[groupSpec.id];
			break;
		}
		else if ( groupSpec.id == record.Name + '_id' )
		{
			keyVal = record.id;
			isExplicitGroupRecord = true;
			break;
		}
		else
		{
			keyVal = record.OptChild( groupSpec.id );
			if ( keyVal != undefined )
				break;
		}
	}

	if ( keyVal == undefined )
		throw "Unable to find macthing group for the record";

	return FindItemByKeyRec( dest, groupSpec.id, keyVal, dest.rootItem );
}


function FindItemByKeyRec( dest, groupSpecID, keyVal, baseItem )
{
	if ( baseItem.groupSpecID == groupSpecID && baseItem.keyVal == keyVal )
		return baseItem;

	for ( collectionName in GetItemAllCollectionNames( dest, baseItem ) )
	{
		if ( baseItem[collectionName] == undefined )
			continue;
		
		for ( item in baseItem[collectionName] )
		{
			subItem = FindItemByKeyRec( dest, groupSpecID, keyVal, item );
			if ( subItem != undefined )
				return subItem;
		}
	}

	return undefined;
}


function InitGroupItemFields( dest, item )
{
	groupSpec = dest.spec.groups.GetChildByKey( item.groupSpecID );
	foreignArray = DefaultDb.GetOptCatalog( groupSpec.foreign_array );
	if ( foreignArray == undefined )
		foreignArray = eval( groupSpec.foreign_array );

	if ( groupSpec.disp_name_field_id.HasValue )
		fieldID = groupSpec.disp_name_field_id;
	else if ( GroupHasOwnColumns( dest, groupSpec ) )
		return;
	else
		fieldID = dest.spec.fields[0].id;

	field = CreateItemField( dest, item, fieldID );

	foreignElem = GetOptForeignElem( foreignArray, item.keyVal );
	if ( foreignElem != undefined )
		field.title = foreignElem.PrimaryDispName;
	else if ( item.keyVal != null && item.keyVal != '' )
		field.title = '[' + UiText.titles.deleted__n + '] ' + item.keyVal;
	else
		field.title = '---';
}


function GroupHasOwnColumns( dest, groupSpec )
{
	return ( ArrayOptFindByKey( dest.spec.fields, groupSpec.foreign_array, 'source_id' ) != undefined );
}


function GetGroupCollectionName( dest, groupSpec )
{
	//if ( groupSpec.ChildIndex == 0 )
		//return "items";

	return "itemsBy" + lib_base.FieldNameToMethodName( groupSpec.id );
}


function GetItemAllCollectionNames( dest, item )
{
	array = ArrayExtract( dest.spec.groups, 'GetGroupCollectionName( dest, This )' );
	return array;
}


function GetItemSubItems( dest, item )
{
	for ( collectionName in lib_stat_v2.GetItemAllCollectionNames( dest, item ) )
	{
		if ( item[collectionName] != undefined )
			return item[collectionName];
	}

	return [];
}


function GetDispItemAllCollectionNames( dest, item )
{
	if ( item.groupSpecID != undefined )
	{
		groupSpecArray = ArraySelect( dest.spec.groups, 'id != item.groupSpecID' );
		groupSpecArray.push( dest.spec.groups.GetChildByKey( item.groupSpecID ) );
	}
	else
	{
		groupSpecArray = dest.spec.groups;
	}
	
	collectionNames = ArrayExtract( groupSpecArray, 'GetGroupCollectionName( dest, This )' );

	if ( ! dest.spec.stat_only && ( dest.spec.groups.ChildNum == 0 || item.groupSpecID == dest.spec.groups[dest.spec.groups.ChildNum - 1].id ) )
		collectionNames.push( 'items' );

	return collectionNames;
}


function BuildGroupItemFullRange( dest, groupSpec, baseItem, foreignArray, parentKeyVal )
{
	fieldID = groupSpec.disp_name_field_id;
	if ( fieldID == '' )
		throw UserError( 'disp_name_field_id is empty' );
	
	collectionName = GetGroupCollectionName( dest, groupSpec );

	if ( lib_voc.get_opt_voc_info( foreignArray.Name ) != undefined )
	{
		array = lib_voc.get_sorted_voc( foreignArray );

		if ( parentKeyVal != undefined )
			array = ArraySelectByKey( foreignArray, parentKeyVal, 'parent_id' );
	}
	else
	{
		array = foreignArray;

		if ( parentKeyVal != undefined )
			array = ArraySelectByKey( foreignArray, parentKeyVal, 'parent_id' );

		array = ArraySort( array, 'PrimaryDispName', '+' );
	}

	catalog = foreignArray;
	if ( catalog.Form.TopElem[0].ChildExists( 'is_active' ) )
		array = ArraySelectByKey( array, true, 'is_active' );
	
	for ( foreignElem in array )
	{
		//item = ArrayOptFindByKey( baseItem[collectionName], foreignElem.id, 'keyVal' );
		//if ( item != undefined )
			//continue;

		item = CreateItem();
		baseItem[collectionName].push( item );
					
		//if ( dest.spec.groups.ChildNum > 1 )
			item.groupSpecID = groupSpec.id;
					
		item.keyVal = foreignElem.id;
			
		field = CreateItemField( dest, item, fieldID );
		field.title = foreignElem.PrimaryDispName;
	}

	baseItem[collectionName + 'FullRangeBuilt'] = true;
}


function GetItemGroupSpec( dest, item )
{
	if ( item.groupSpecID == undefined )
		return undefined;

	return dest.spec.groups.GetOptChildByKey( item.groupSpecID );
}


function ObtainRecordItems( dest, record, auxKeyData )
{
	items = ObtainRecordGroupItems( dest, record, auxKeyData );
	baseItem = items[items.length - 1];

	item = CreateItem( dest );
	item.objectID = record.id;
	item.primaryObjectTypeID = ObjectNameFromUrl( record.PrimaryObjectUrl );

	if ( baseItem.items == undefined )
		baseItem.items = new Array;
	baseItem.items.push( item );

	items.push( item );
	return items;
}


function AddExplicitRecordGroupItem( dest, record, groupSpecID, auxKeyData )
{
	if ( dest.build_stages_num > 1 )
	{
		dest.innerProgress.CurrentItemIndex++;
		if ( dest.innerProgress.CurrentItemIndex >= dest.innerProgress.ItemCount )
			dest.innerProgress.ItemCount++;
	}

	if ( groupSpecID == undefined && dest.spec.groups.ChildNum == 1 )
	{
		groupSpec = dest.spec.groups[0];
		groupSpecID = groupSpec.id;
	}
	else
	{
		groupSpec = dest.spec.groups.GetOptChildByKey( groupSpecID );
		if ( groupSpec == undefined )
			throw UserError( 'No such group: ' + groupSpecID );
	}

	//auxKeyData = undefined;
	baseItemsArray = [dest.rootItem];

	for ( groupLevel = 0; groupLevel < groupSpec.group_level; groupLevel++ )
		baseItemsArray = ObtainRecordGroupLevelItems( dest, record, auxKeyData, groupLevel, baseItemsArray )

	baseItem = baseItemsArray[0];
	//baseItem = dest.rootItem;

	collectionName = GetGroupCollectionName( dest, groupSpec );
	
	item = CreateItem( dest );
	item.groupSpecID = groupSpecID;
	item.keyVal = record.id;

	InitGroupItemFields( dest, item );
	
	if ( baseItem[collectionName] == undefined )
		baseItem[collectionName] = new Array;
	baseItem[collectionName].push( item );
	
	ProcessItemAutoCalcFields( dest, item, record );
	return item;

	//items = ObtainRecordItems( dest, record, auxKeyData );
	//return items[items.length - 1];
}


function ProcessItemAutoCalcFields( dest, item, record )
{
	catalogName = lib_base.object_name_to_catalog_name( record.Name );

	for ( fieldSpec in dest.spec.fields )
	{
		if ( ! fieldSpec.auto_calc && ! fieldSpec.value_expr.HasValue )
			continue;

		if ( fieldSpec.source_id != catalogName )
			continue;

		CalcField( dest, item, fieldSpec, record );
	}
}


function CalcField( dest, item, fieldSpec, record )
{
	useForeignElem = false;

	if ( fieldSpec.value_expr.HasValue )
	{
		fieldValue = SafeEval( fieldSpec.value_expr, [record, dest] );
	}
	else
	{
		elem = GetObjectProperty( record, fieldSpec.elem_name );
		if ( ObjectType( elem ) == 'XmElem' || ObjectType( elem ) == 'XmMultiElem' )
		{
			if ( elem.FormElem.ForeignArrayExpr != '' )
			{
				if ( fieldSpec.foreign_hier_level.HasValue )
				{
					hierChain = lib_base.get_hier_desc_chain( elem.ForeignArray, elem );
					if ( fieldSpec.foreign_hier_level < hierChain.length )
						fieldValue = hierChain[fieldSpec.foreign_hier_level].name;
					else
						fieldValue = undefined;
				}
				else
				{
					fieldValue = elem.ForeignDispName;
				}

				useForeignElem = true;
			}
			else
			{
				fieldValue = elem.Value;
			}
		}
		else
		{
			fieldValue = elem;
		}
			
		if ( fieldValue == undefined )
			return;
	}

	lib_stat_v2.SetItemFieldValue( dest, item, fieldSpec.id, fieldValue );

	if ( useForeignElem )
	{
		item.fields[fieldSpec.id].elem = elem;
	}

	if ( fieldSpec.bk_color_expr != '' )
	{
		with ( record )
		{
			try
			{
				item.fields[fieldSpec.id].bkColor = eval( fieldSpec.bk_color_expr );
			}
			catch ( e )
			{
				LogEvent( 'expr-err', 'bk_color_expr error: ' + e );
			}
		}
	}
}


function AddItemFieldSourceRecord( dest, item, fieldID, record, statValue )
{
	fieldSpec = dest.spec.fields.GetOptChildByKey( fieldID );
	if ( fieldSpec == undefined )
	{
		//return;
		throw UserError( 'No such field: ' + fieldID );
	}

	field = item.fields[fieldID];
	if ( field == undefined )
	{
		field = new Object;
		field.SetStrictMode( false );
		item.fields[fieldID] = field;
	}

	if ( field.srcRecords == undefined )
		field.srcRecords = new Array;

	field.srcRecords.push( RValue( record.id ) );

	if ( fieldSpec.stat_func.HasValue )
	{
		if ( field.value == undefined )
			field.value = ( fieldSpec.data_type == 'real' ? Real( 0 ) : 0 );
	}

	if ( fieldSpec.stat_func == 'count' )
	{
		field.value++;
	}
	else if ( fieldSpec.stat_func.HasValue && statValue != undefined && statValue != null )
	{
		field.value += statValue;
	}
}


function GetItemFieldSrcRecordIDs( dest, item, fieldID )
{
	array = new Array;

	if ( ( field = item.fields[fieldID] ) != undefined && field.srcRecords != undefined )
		array.AddArray( item.fields[fieldID].srcRecords );

	for ( collectionName in GetItemAllCollectionNames( dest, item ) )
	{
		if ( item[collectionName] != undefined )
			array.AddArray( ArrayExpand( item[collectionName], 'GetItemFieldSrcRecordIDs( dest, This, fieldID )' ) );
	}

	array = ArraySelectDistinct( array );
	return array;
}


function AdjustItemOrder( dest, item )
{
	for ( groupSpec in dest.spec.groups )
	{
		collectionName = GetGroupCollectionName( dest, groupSpec );
		if ( item[collectionName + 'FullRangeBuilt'] )
			continue;
		else if ( item[collectionName] == undefined )
			continue;

		if ( groupSpec.foreign_array.HasValue )
		{
			if ( ( vocInfo = lib_voc.get_opt_voc_info( groupSpec.foreign_array ) ) != undefined )
			{
				if ( vocInfo.auto_order.HasValue )
					item[collectionName] = ArraySort( item[collectionName], 'GetForeignElem( ' + groupSpec.foreign_array + ', keyVal ).name', '+' );
				else
					item[collectionName] = ArraySort( item[collectionName], 'keyVal', '+' );
			}
			else
			{
				if ( dest.spec.fields.GetOptChildByKey( groupSpec.id ) != undefined )
					item[collectionName] = ArraySort( item[collectionName], 'This.fields[groupSpec.id].title', '+', 'This.fields[groupSpec.id].value', '+' );
				else
					item[collectionName] = ArraySort( item[collectionName], 'GetForeignElem( ' + groupSpec.foreign_array + ', keyVal ).PrimaryDispName', '+' );
			}
		}

		for ( subItem in item[collectionName] )
			AdjustItemOrder( dest, subItem );
	}
}


function CalcItemSumValues( dest, item )
{
	for ( collectionName in GetItemAllCollectionNames( dest, item ) )
	{
		if ( item[collectionName] == undefined )
			continue;

		for ( subItem in item[collectionName] )
			CalcItemSumValues( dest, subItem );
	}

	for ( fieldSpec in dest.spec.fields )
	{
		if ( ! fieldSpec.stat_func.HasValue )
			continue;

		if ( fieldSpec.stat_func == 'count' )
		{
			idArray = GetItemFieldSrcRecordIDs( dest, item, fieldSpec.id );

			field = CreateItemField( dest, item, fieldSpec.id );
			field.value = idArray.length;
		}
		else if ( fieldSpec.stat_func == 'sum' || fieldSpec.stat_func == 'average' )
		{
			prevGroupSpec = undefined;

			for ( groupSpec in dest.spec.groups )
			{
				collectionName = GetGroupCollectionName( dest, groupSpec );
				if ( item[collectionName] == undefined )
					continue;

				if ( prevGroupSpec != undefined && prevGroupSpec.group_level == groupSpec.group_level )
					continue;

				subSum = ArraySum( item[collectionName], 'subField = This.fields[fieldSpec.id], ( subField != undefined && subField.value != undefined ) ? subField.value : 0' );
				if ( subSum != 0 )
				{
					field = CreateItemField( dest, item, fieldSpec.id );

					if ( field.value != undefined )
						field.value += subSum;
					else
						field.value = subSum;

					if ( fieldSpec.stat_func == 'average' )
						field.value /= item[collectionName].length;
				}

				prevGroupSpec = groupSpec;
			}
		}

		if ( fieldSpec.stat_func == 'average' )
		{
			field = CreateItemField( dest, item, fieldSpec.id );
			if ( field.value != undefined && field.srcRecords != undefined && field.srcRecords.length > 0 )
			{
				field.value /= field.srcRecords.length;
			}
		}
		/*else if ( fieldSpec.stat_func == 'count_percent' )
		{
			totalCount = dest.total.columns[fieldSpec.ChildIndex].value;
			if ( totalCount == 0 )
				continue;

			item.columns[fieldSpec.ChildIndex].value = ( item.columns[fieldSpec.ChildIndex].value * 100 ) / totalCount;
		}
		else if ( fieldSpec.stat_func == 'match_percent' && item.columns[fieldSpec.ChildIndex].stat_count != 0 )
		{
			item.columns[fieldSpec.ChildIndex].value = ( item.columns[fieldSpec.ChildIndex].value * 100 ) / item.columns[fieldSpec.ChildIndex].stat_count;
		}*/
	}
}


function FinalizeItem( dest, item )
{
	for ( collectionName in GetItemAllCollectionNames( dest, item ) )
	{
		if ( item[collectionName] == undefined )
			continue;

		for ( subItem in item[collectionName] )
			FinalizeItem( dest, subItem );
	}

	for ( fieldSpec in dest.spec.fields )
	{
		CalcItemFieldAutoValue( dest, item, fieldSpec );

		if ( fieldSpec.force_final_value && item.fields[fieldSpec.id] == undefined )
			CreateItemField( dest, item, fieldSpec.id );
	}

	if ( dest.codeLib != undefined && dest.codeLib.PropertyExists( 'FinalizeReportItem' ) )
		dest.codeLib.FinalizeReportItem( dest, item );
}


function CalcItemFieldAutoValue( dest, item, fieldSpec )
{
	if ( fieldSpec.expr.HasValue )
		CalcItemFieldExprValue( dest, item, fieldSpec );
	else if ( fieldSpec.is_percent && fieldSpec.numerator_field_id.HasValue )
		CalcItemFieldPercentValue( dest, item, fieldSpec );
}


function CalcItemFieldExprValue( dest, item, fieldSpec )
{
	env = new Object;
	env.item = item;

	for ( otherFieldID in fieldSpec.depends_on_fields )
	{
		otherFieldVal = GetItemFieldValue( dest, item, otherFieldID );
		otherField = item.fields[otherFieldID];
		if ( otherField == undefined || otherField.value == undefined )
			return;

		if ( otherField.elem != undefined )
			env[otherFieldID] = otherField.elem;
		else
			env[otherFieldID] = otherField.value;
	}

	val = SafeEval( fieldSpec.expr, [env] );

	field = new Object;
	field.SetStrictMode( false );
	item.fields[fieldSpec.id] = field;

	field.value = val;
}


function CalcItemFieldPercentValue( dest, item, fieldSpec )
{
	field1 = item.fields[fieldSpec.numerator_field_id];
	if ( field1 == undefined || field1.value == undefined )
		return;

	field2 = item.fields[fieldSpec.denominator_field_id];
	if ( field2 == undefined || field2.value == undefined || field2.value == 0 )
		return;

	field = new Object;
	field.SetStrictMode( false );
	item.fields[fieldSpec.id] = field;

	field.value = ( field1.value * 100 ) / field2.value;
}




function GetDispItems( dest )
{
	destArray = new Array;
	if ( dest.rootItem == undefined )
		return destArray;
	
	if ( dest.postHeaderItems != undefined )
		destArray.AddArray( dest.postHeaderItems );

	AddItemChildDispItemsRec( dest, dest.rootItem, destArray, 0 );

	if ( dest.spec.show_total )
		destArray.push( dest.rootItem );
				
	if ( dest.footerItems != undefined )
	{
		for ( item in dest.footerItems )
			AddFooterItemChildDispItemsRec( dest, item, destArray, 0 );
	}

	return destArray;
}


function AddItemChildDispItemsRec( dest, item, destArray, hierLevel )
{
	for ( collectionName in GetDispItemAllCollectionNames( dest, item ) )
	{
		if ( item[collectionName] == undefined )
			continue;

		for ( subItem in item[collectionName] )
		{
			if ( hierLevel != 0 )
				subItem.hierLevel = hierLevel;
			
			destArray.push( subItem );
			AddItemChildDispItemsRec( dest, subItem, destArray, hierLevel + 1 );
		}
	}
}


function AddFooterItemChildDispItemsRec( dest, item, destArray, hierLevel )
{
	if ( hierLevel != 0 )
		item.hierLevel = hierLevel;

	destArray.push( item );

	if ( item.items == undefined )
		return;

	for ( subItem in item.items )
	{
		AddFooterItemChildDispItemsRec( dest, subItem, destArray, hierLevel + 1 );
	}
}


function IsItemBold( dest, item )
{
	if ( item.isBold )
		return true;
	
	if ( item === dest.rootItem )
		return true;

	groupSpec = GetItemGroupSpec( dest, item );
	if ( groupSpec != undefined && groupSpec.bold )
		return true;

	return false;
}


function IsItemCellClickable( dest, item, field, fieldSpec )
{
	if ( field == undefined )
		return false;

	if ( field.value == undefined || field.value == 0 )
		return false;

	if ( fieldSpec.src_object_type_id.HasValue )
		return true;

	return false;
}


function GetItemCellIndentStr( dest, item, field, fieldSpec )
{
	return String( '    ' ).repeat( GetItemCellIndentLevel( dest, item, field, fieldSpec ) );
}


function GetItemCellIndentLevel( dest, item, field, fieldSpec )
{
	if ( fieldSpec.ChildIndex != 0 )
		return 0;

	if ( item.hierLevel == undefined )
		return 0;

	return item.hierLevel;
}


function GetItemCellTitle( dest, item, field, fieldSpec, options )
{
	useExcel = ( options != undefined && options.GetOptProperty( 'excel' ) == true );

	if ( item === dest.rootItem && fieldSpec.ChildIndex == 0 )
		return UiText.titles.stat_total;

	if ( field == undefined )
		return GetItemCellEmptyTitle( dest, item, field, fieldSpec );

	if ( field.title != undefined )
		return field.title;

	if ( field.value == undefined )
		return GetItemCellEmptyTitle( dest, item, field, fieldSpec );

	if ( field.value == 0 && ! fieldSpec.show_zeroes )
	{
		if ( dest.spec.hide_zero_stat_values && fieldSpec.stat_func.HasValue )
			return '';

		if ( fieldSpec.data_type == 'integer' || fieldSpec.stat_func.HasValue )
			return '-';

		return '';
	}
	
	if ( useExcel && DataType( field.value ) == 'integer' && ! fieldSpec.is_percent  )
		return field.value;

	if ( fieldSpec.data_type == 'real' || fieldSpec.is_percent || DataType( field.value ) == 'real' )
	{
		str = StrReal( field.value, ( fieldSpec.float_precision.HasValue ? fieldSpec.float_precision : 0 ), true );

		if ( fieldSpec.is_percent )
			str += '%';

		return str;
	}

	if ( DataType( field.value ) == 'integer' )
	{
		str = StrSignedInt( field.value );
		return str;
	}

	if ( DataType( RValue( field.value ) ) == 'date' )
	{
		str = StrDate( field.value, fieldSpec.use_time == true );
		return str;
	}

	if ( fieldSpec.disp_format == 'phone' )
	{
		return lib_phone_details.FormatPhone( field.value );
	}

	return UnifySpaces( field.value );





	column = item.columns[_header_column.ChildIndex];
	field = Ps.spec.fields[_header_column.ChildIndex];

	if ( fieldSpec.stat_only && item.group_level == null )
		return '';

	elem = undefined;
							
	if ( item.record_ref.HasValue )
	{
		record = item.record_ref.Object;

		if ( _header_column.elem_ref.HasValue )
			elem = record.OptChild( _header_column.elem_ref.Object.Name );
	}

	str = column.indent_str;
							
	if ( fieldSpec.title_expr.HasValue )
	{
		try
		{
			Value = column.value;
			str += eval( fieldSpec.title_expr );
		}
		catch ( e )
		{
			str += UnifySpaces( e );
		}
	}
	/*else if ( elem != undefined && elem.FormElem.ForeignArrayExpr != '' )
	{
		if ( elem.FormElem.IsMultiple )
			str += elem.MultiElem.ForeignDispName;
		else
			str += elem.ForeignDispName;
	}*/
	else if ( item.Name != 'total' && _header_column.elem_ref.HasValue && _header_column.elem_ref.Object.ForeignArrayExpr != '' )
	{
		if ( elem != undefined )
		{
			//if ( _header_column.title == 'Кандидат' )
				//DebugMsg( _header_column.elem_ref.Object.IsMultiple );

			if ( _header_column.elem_ref.Object.IsMultiple )
			{
				str += elem.MultiElem.ForeignDispName;
			}
			else
			{
				str += elem.ForeignDispName;
			}
		}
	}
	else if ( ( _header_column.data_type == 'integer' || ( item.group_level != null && fieldSpec.stat_func != '' ) ) && ( DataType( column.value.Value ) == 'integer' || ( DataType( column.value.Value ) == 'real' ) || _header_column.data_type == 'integer' ) )
	{
		if ( RValue( column.value ) == undefined )
			return '';

		//if ( OptInt( column.value ) == undefined )
			//return '';

		str += StrIntZero( column.value, 0, ! StrEnds( fieldSpec.id, 'year' ) );

		if ( fieldSpec.is_percent && column.value != null && column.value != 0 )
			str += '%';
	}
	else if ( _header_column.data_type == 'real' )
	{
		if ( RValue( column.value ) == undefined )
			return '';

		if ( column.value != Real( 0 ) )
			str += StrReal( column.value, ( fieldSpec.float_precision.HasValue ? fieldSpec.float_precision : 0 ), true );
		else
			str += '-';

		if ( fieldSpec.is_percent && column.value != null && column.value != 0 )
			str += '%';
	}
	else if ( _header_column.data_type == 'bool' && ! ( item.group_level != null /*&& _header_column.stat_func != ''*/ ) )
	{
		str += ( column.value ? '+' : '' );
	}
	else
	{
		str += column.value;
	}

	return str;
}


function GetItemCellEmptyTitle( dest, item, field, fieldSpec )
{
	return '';
}


function GetItemCellTipText( dest, item, field, fieldSpec )
{
	if ( field == undefined )
		return '';

	if ( field.errorText != undefined )
		return field.errorText;

	return '';
}


function GetItemCellTextColor( dest, item, field, fieldSpec )
{
	if ( field != undefined )
	{
		if ( field.textColor != undefined )
			return field.textColor;
	}
		
	return '';
}


function GetItemCellBkColor( dest, item, field, fieldSpec )
{
	if ( field != undefined )
	{
		if ( field.bkColor != undefined )
			return field.bkColor;
	}

	if ( item.bkColor != undefined )
		return item.bkColor;

	groupSpec = GetItemGroupSpec( dest, item );
	if ( groupSpec != undefined && groupSpec.bk_color.HasValue )
		return groupSpec.bk_color;

	if ( item === dest.rootItem )
		return '240,240,240';

	if ( fieldSpec.bk_color.HasValue )
		return fieldSpec.bk_color;

	return '';
}


function OpenItem( dest, item )
{
	if ( dest.spec.open_action != '' )
	{
		eval( dest.spec.open_action );
		return;
	}

	if ( ( groupSpec = GetItemGroupSpec( dest, item ) ) != undefined && item.keyVal != undefined && item.keyVal != null )
	{
		objectUrl = ObjectDocUrl( 'data', lib_base.catalog_name_to_object_name( groupSpec.foreign_array ), item.keyVal );
		ObtainDocScreen( objectUrl );
		return;
	}

	if ( item.objectID == undefined )
		Cancel();

	if ( item.primaryObjectTypeID == undefined )
		Cancel();

	objectUrl = ObjectDocUrl( 'data', item.primaryObjectTypeID, item.objectID );
	ObtainDocScreen( objectUrl );
}


function OpenItemCellLink( dest, item, field, fieldSpec )
{
	idArray = GetItemFieldSrcRecordIDs( dest, item, fieldSpec.id );
	
	doc = FetchDoc( 'x-app://base1/base1_view_stat_details_v2.xml' );
	doc.TopElem.object_type_id = fieldSpec.src_object_type_id;
	doc.TopElem.ids_array_ref = idArray;

	frame = dest.Screen.FindOptItem( 'FrameStatSrcData' );
	if ( frame == undefined )
	{
		dest.sub_selector = 'src_data';
		dest.Screen.Update();

		frame = dest.Screen.FindOptItem( 'FrameStatSrcData' );
	}

	frame.InnerScreen.Navigate( doc.Url );
}


function OnFilterChanged( dest, dynFilterID, filterElem )
{
	dynFilterSpec = dest.spec.dyn_filters.GetChildByKey( dynFilterID );
	if ( dynFilterSpec.is_spec_modifier )
	{
		InitStatResult( dest );
	}

	lib_view.store_filter_elem( dest.spec.id, filterElem );
}


function GetStatDataEntry( dest )
{
	return stat_local_data.stat_data_entries.ObtainChildByKey( dest.spec.id );
}


function BuildChart( dest )
{
	if ( dest.rootItem == undefined )
		return;

	statDataEntry = lib_stat_v2.GetStatDataEntry( dest );

	if ( System.IsWebClient )
	{
		dest2 = new Object;
		dest2.spec = dest.spec.CloneWithoutForm();
		dest2.rootItem = dest.rootItem;

		htmlStr = CallServerMethod( 'lib_stat_v2', 'BuildChartHtml', [dest2, statDataEntry] );
		//htmlStr = "<html>aaa</html>";
		dest.chart_data.html_str = htmlStr;

		//hyper = dest.Screen.FindItem( 'ChartHyper' );
		//hyper.SetHtml( htmlStr );
	}
	else
	{
		htmlStr = BuildChartHtml( dest, statDataEntry );

		tempUrl = ObtainSessionTempFile( '.htm' );
		PutUrlData( tempUrl, htmlStr );

		dest.chart_data.page_url = tempUrl;

		//hyper = dest.Screen.FindItem( 'ChartHyper' );
		//hyper.Navigate( dest.chart_page_url );
	}
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function BuildChartHtml( dest, statDataEntry )
{
	if ( dest.codeLib != undefined && dest.codeLib.PropertyExists( 'BuildChartHtml' ) )
		return dest.codeLib.BuildChartHtml( dest, statDataEntry );

	groupSpec = dest.spec.groups[0];
	collectionName = lib_stat_v2.GetGroupCollectionName( dest, groupSpec );
	if ( dest.rootItem[collectionName] == undefined )
		return;

	baseItem = dest.rootItem;

	if ( groupSpec.is_hier )
	{
		while ( true )
		{
			if ( baseItem[collectionName].length == 1 && baseItem[collectionName][0][collectionName] != undefined )
			{
				baseItem = baseItem[collectionName][0];
				continue;
			}

			break;
		}
	}
	
	if ( groupSpec.disp_name_field_id.HasValue )
		dispNameFieldID = groupSpec.disp_name_field_id;
	else
		dispNameFieldID = dest.spec.fields[0].id;

	env = new Object;
	env.chartConfig = new Object;
    env.chartConfig.type = 'bar';
    //env.chartConfig.type = 'line';
	env.chartConfig.data = new Object;
	env.chartConfig.data.labels = ArrayExtract( baseItem[collectionName], 'fields[dispNameFieldID].title' );
	env.chartConfig.data.labels = ArraySort( env.chartConfig.data.labels, 'This', '+' );
	//DebugMsg( dest.chartConfig.data.labels.length );

	env.chartConfig.data.datasets = new Array;
	restChartColors = ArraySelectAll( base1_common.chart_colors );

	for ( fieldSpec in dest.spec.fields )
	{
		if ( fieldSpec.chart_bk_color.HasValue && ( i = restChartColors.FindIndexByKey( fieldSpec.chart_bk_color, 'id' ) )  >= 0 )
			restChartColors.splice( i, 1 );
	}

	for ( fieldSpec in dest.spec.fields )
	{
		//if ( ! fieldSpec.stat_func.HasValue )
			//continue;

		if ( ! statDataEntry.chart.target_fields.ChildByKeyExists( fieldSpec.id ) )
			continue;

		dataset = new Object;
		dataset.id = fieldSpec.id;
		dataset.label = fieldSpec.chart_title;
		
		dataset.data = ArrayExtract( baseItem[collectionName], 'lib_stat_v2.GetItemFieldValue( dest, This, fieldSpec.id )' );
		
		if ( fieldSpec.chart_bk_color.HasValue )
		{
			bkColor = fieldSpec.chart_bk_color;
		}
		else
		{
			if ( restChartColors.length > 0 )
			{
				chartColor = restChartColors[0];
				restChartColors.splice( 0, 1 );
			}
			else
			{
				chartColor = base1_common.chart_colors.GetChildByKey( 'gray' );
			}

			bkColor = chartColor.id;
		}

		dataset.backgroundColor = StdColorToChartBkColor( bkColor );
		dataset.borderColor = StdColorToChartBorderColor( bkColor );
		
		dataset.borderWidth = 1;

		//if ( fieldSpec.id == 'closed_after_deadline_vacancy_count' )
			//dataset.stack = 'closed_vacancy_count';

		env.chartConfig.data.datasets.push( dataset );
	}

 	env.chartConfig.options = new Object;

    env.chartConfig.options.responsive = true,
	//env.chartConfig.options.maintainAspectRatio = false,
	//responsiveAnimationDuration: 1,
	env.chartConfig.options.animation = {
		duration: 0
	};

	env.chartConfig.options.title = {
		//display: true
	};

	//env.chartConfig.options.maxBarThickness = 10;
	//env.chartConfig.options.scaleOverride = true;
	//env.chartConfig.options.scaleSteps = 10;
	//env.chartConfig.options.scaleStepWidth = 10;
	
	env.chartConfig.options.scales = {
		xAxes: [{
			//stacked: true,
			ticks: {
				beginAtZero:true
			}
		}],
		yAxes: [{
			//stacked: true,
			ticks: {
				beginAtZero:true
			}
		}]
	}

	/*if ( dest.is_running_on_server )
	{
		dest.chart_page_html = EvalCodePageUrl( 'x-app://base1/base1_stat_chart_fragment.htm', 'strict-errors=1' );
		dest.chart_page_script = EvalCodePageUrl( 'x-app://base1/base1_stat_chart_fragment.js', 'strict-errors=1' );
		return;
	}*/

	if ( CurRequest != undefined )
		env.scriptUrl = '/ui_misc/Chart.min.js';
	else
		env.scriptUrl = FilePathToUrl( FilePath( FilePath( FilePath( AppDirectoryPath(), "misc" ), "chart" ), 'Chart.min.js' ) );

	htmlStr = EvalCodePageUrl( 'x-app://base1/base1_stat_chart_v2.htm', 'strict-errors=1' );
	return htmlStr;
}


function HandleShowChart( dest )
{
	ShowChartPrepare( dest );
	dest.sub_selector = 'chart';

	if ( System.IsWebClient && ( hyper = dest.Doc.Screen.FindOptItem( 'ChartHyper' ) ) == undefined )
		dest.Doc.Screen.Update();

	if ( ( hyper = dest.Doc.Screen.FindOptItem( 'ChartHyper' ) ) != undefined )
		UpdateChartHyper( dest, hyper );
}


function UpdateChartHyper( dest, hyper )
{
	if ( dest.chart_data.page_url.HasValue )
		hyper.Navigate( dest.chart_data.page_url );
	else
		hyper.SetHtml( dest.chart_data.html_str );
}


function HandlePreviewChartInBrowser( dest )
{
	ShowChartPrepare( dest );
	ShellExecute( 'open', dest.chart_data.page_url );
}


function ShowChartPrepare( dest )
{
	if ( ! dest.spec.show_chart )
		throw UiError( UiText.errors.stat_chart_not_supported );

	statDataEntry = lib_stat_v2.GetStatDataEntry( dest );
	if ( statDataEntry.chart.target_fields.ChildNum == 0 )
	{
		for ( fieldSpec in dest.spec.fields )
		{
			if ( ! fieldSpec.stat_func.HasValue )
				continue;

			statDataEntry.chart.target_fields.ObtainChildByKey( fieldSpec.id );
		}
	}

	BuildChart( dest );
}


function StdColorToChartBkColor( stdColor )
{
	if ( ( chartColor = base1_common.chart_colors.GetOptChildByKey( stdColor ) ) != undefined )
		bkColor = chartColor.bk_color;
	else
		bkColor = stdColor;

	return 'rgba(' + bkColor + ',0.2)';
}


function StdColorToChartBorderColor( stdColor )
{
	if ( ( chartColor = base1_common.chart_colors.GetOptChildByKey( stdColor ) ) != undefined )
		bkColor = chartColor.bk_color;
	else
		bkColor = stdColor;

	return 'rgb(' + bkColor + ')';
}


function CalcFilterPeriod( periodSettings )
{
	period = new Object;
	period.startDate = null;
	period.endDate = null;

	if ( periodSettings.unit_id == 'm' )
	{
		year = Year( CurDate );
		month = Month( CurDate );

		if ( periodSettings.unit_specifier_id == 'prev' )
		{
			if ( month > 1 )
			{
				month--;
			}
			else
			{
				year--;
				month = 12;
			}
		}

		period.startDate = Date( year, month, 1 );
		period.endDate = DateOffset( lib_base.get_month_date_offset( period.startDate, 1 ), 0 - 86400 );
	}
	else if ( periodSettings.unit_id == 'q' )
	{
		year = Year( CurDate );
		quarter = lib_base.get_date_quarter( CurDate );

		if ( periodSettings.unit_specifier_id == 'prev' )
		{
			if ( quarter > 1 )
			{
				quarter--;
			}
			else
			{
				year--;
				quarter = 4;
			}
		}

		period.startDate = lib_base.GetQuarterStartDate( year, quarter );
		period.endDate = lib_base.GetQuarterEndDate( year, quarter );
	}
	else if ( periodSettings.unit_id == 'w' )
	{
		if ( periodSettings.unit_specifier_id == 'prev' )
			baseDate = DateOffset( CurDate, - 7 * 86400 );
		else
			baseDate = CurDate;

		period.startDate = lib_calendar.get_week_start_date( baseDate );
		period.endDate = DateOffset( period.startDate, 6 * 86400 );
	}


	return period;
}