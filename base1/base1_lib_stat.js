function build_stat_url( statID )
{
	viewUrl = 'x-app://base1/base1_view_stat.xml?id=' + statID;
}


function obtain_stat_url( statID )
{
	viewUrl = build_stat_url( statID );
	if ( GetOptCachedDoc( viewUrl ) != undefined )
		return viewUrl;

	param = build_stat_param( statID );
	
	form = RegisterFormFromStr( viewUrl, '<SPXML-FORM><generic_view></generic_view></SPXML-FORM>' );
	build_form( param, form );

	if ( LdsIsClient )
	{
		screenFormData = build_screen_form( param, false );
		PutUrlData( 'x-local://Logs/zz.xms', screenFormData );
		RegisterScreenFormFromStr( ReplaceUrlPathSuffix( viewUrl, '.xml', '.xms' ), screenFormData );
	}

	doc = OpenNewDoc( viewUrl );
	doc.Url = viewUrl;
	doc.SetCached();
	
	//load_stored_filters( statID, doc.TopElem.filter );
	adjust_filters( statID, doc.TopElem );

	if ( param.stat.is_v2 )
		lib_stat_v2.InitStatResult( doc.TopElem );

	return viewUrl;
}


function obtain_stat_form_url( statID )
{
	formUrl = build_stat_url( statID );
	formUrl = StrReplaceOne( formUrl, '.xml', '.xmd' );
	if ( GetOptCachedForm( formUrl ) != undefined )
		return formUrl;

	param = build_stat_param( statID );
	
	form = RegisterFormFromStr( formUrl, '<SPXML-FORM><generic_view></generic_view></SPXML-FORM>' );
	build_form( param, form );
	return formUrl;
}


function build_form( param, form )
{
	elem = form.TopElem.AddChild( 'stat_id', 'string' );
	elem.DefaultValue = param.stat.id;
	elem.ForeignArrayExpr = 'stats';


	filter = form.TopElem.AddChild( 'filter', '' );

	for ( dynFilter in param.stat.dyn_filters )
	{
		if ( ! dynFilter.source_id.HasValue && param.stat.is_v2 && param.stat.default_catalog_name.HasValue && ! dynFilter.data_type.HasValue )
			dynFilter.source_id = param.stat.default_catalog_name;

		if ( dynFilter.source_id.HasValue )
			elem = get_dyn_filter_target_elem( param.stat, dynFilter );
		else
			elem = undefined;

		if ( dynFilter.data_type.HasValue )
			dataType = dynFilter.data_type;
		else if ( elem != undefined )
		{
			dataType = elem.Type;

			if ( param.stat.is_v2 )
				dynFilter.data_type = dataType;
		}
		else
			dataType = '';

		if ( dynFilter.use_range )
		{
			filterElem = filter.AddChild( 'min_' + path_to_filter_elem_name( dynFilter.id ), dataType );
			filterElem = filter.AddChild( 'max_' + path_to_filter_elem_name( dynFilter.id ), dataType );
		}
		else if ( dynFilter.use_range_min )
		{
			filterElem = filter.AddChild( 'min_' + path_to_filter_elem_name( dynFilter.id ), dataType );
		}
		else
		{
			filterElem = filter.AddChild( path_to_filter_elem_name( dynFilter.id ), dataType );
			
			if ( dynFilter.foreign_array.HasValue )
			{
				filterElem.ForeignArrayExpr = dynFilter.foreign_array;
			}
			else if ( elem != undefined )
			{
				filterElem.ForeignArrayExpr = elem.ForeignArrayExpr;

				if ( elem.ForeignArrayExpr != '' && param.stat.is_v2 )
					dynFilter.foreign_array = elem.ForeignArrayExpr;
			}

			if ( dynFilter.is_multiple && filterElem.ForeignArrayExpr != '' )
				filterElem.IsMultiple = true;

			if ( dataType == 'bool' && ! param.stat.is_v2 )
				filterElem.NullFalse = true;

			if ( dynFilter.default_value != '' )
				filterElem.DefaultValue = dynFilter.default_value;

			//if ( dynFilter.is_auto )
				//alert( dynFilter.id );
		}
	}

	if ( param.stat.is_v2 )
		form.TopElem.Inherit( FetchForm( 'base1_general_stat.xmd' ).Child( 'stat_result_v2_base' ) );
	else
		form.TopElem.Inherit( FetchForm( 'base1_general_stat.xmd' ).Child( 'stat_result_base' ) );
}


function build_screen_form( param )
{
	rootItem = OpenDocFromStr( '<SPXML-SCREEN></SPXML-SCREEN>' ).TopElem;
	rootItem.AddAttr( 'SOURCE', 'TopElem' );

	//if ( System.IsWebClient )
		//rootItem.AddAttr( 'PORTAL-STYLE', '1' );

	build_screen_form_core( param, rootItem );
	return rootItem.Xml;
}


function build_screen_form_core( param, rootItem )
{
	rootItem.AddAttr( 'TITLE', param.stat.name );

	if ( param.stat.width.HasValue )
	{
		rootItem.AddAttr( 'WIDTH', param.stat.width );
		//rootItem.AddAttr( 'HEIGHT', param.stat.height );
		rootItem.AddAttr( 'RESIZE', 1 );
	}
	else
	{
		rootItem.AddAttr( 'MAXIMIZED', 1 );
	}

	rootItem.AddAttr( 'WINDOW-ICON-URL', '//base_pict/stat.ico' );

	if ( ! param.stat.is_v2 )
		rootItem.AddAttr( 'BEFORE-INIT-ACTION', 'lib_stat.init_stat_result( Ps )' );


	if ( param.stat.is_v2 )
	{
		item = rootItem.AddChild( 'USE' );
		item.AddAttr( 'FORM', 'base1_general_stat_v2.xms' );
	}

	if ( param.stat.width.HasValue )
	{
		item = rootItem.AddChild( 'INHERIT' );
		item.AddAttr( 'TYPE', 'min_menus' );
	}

	panel = rootItem.AddChild( 'PANEL' );
	panel.AddAttr( 'SUNKEN', 1 );
	panel.AddAttr( 'STD-MARGINS', 1 );
	panel.AddAttr( 'BK-COLOR-EXPR', 'SysColors.PanelLightBackground' );

	item = rootItem.AddChild( 'SPLIT' );
	item.AddAttr( 'FIXED', '1' );

	
	prevIndex = 0;

	for ( i = 0; i <= param.stat.dyn_filters.ChildNum; i++ )
	{
		if ( i == param.stat.dyn_filters.ChildNum || param.stat.dyn_filters[i].use_new_line )
		{
			if ( prevIndex != 0 )
			{
				delim = panel.AddChild( 'PANEL' );
				delim.AddAttr( 'HEIGHT', '2px' );
			}
			
			build_screen_dyn_filters_line( param, panel, ArrayRange( param.stat.dyn_filters, prevIndex, i - prevIndex ), prevIndex );
			prevIndex = i;
		}
	}

	menu = panel.AddChild( 'MENU' );
	menu.AddAttr( 'RIGHT-CLICK', '1' );

	menuEntry = menu.AddChild( 'MENU-ENTRY' );
	menuEntry.AddAttr( 'TITLE', UiText.actions.show );
	menuEntry.AddAttr( 'ACTION', 'lib_stat.calc_stat_result( Ps )' );

	menuEntry = menu.AddChild( 'MENU-ENTRY' );
	menuEntry.AddAttr( 'SEPARATOR', '1' );

	menuEntry = menu.AddChild( 'MENU-ENTRY' );
	menuEntry.AddAttr( 'TITLE', UiText.actions.clear_form );
	menuEntry.AddAttr( 'ACTION', 'Ps.filter.Clear(); lib_stat.adjust_filters( ' + CodeLiteral( param.stat.id ) + ', Ps );' );


	item = rootItem.AddChild( 'INHERIT' );
	
	if ( param.stat.is_v2 )
	{
		item.AddAttr( 'TYPE', 'stat_items_v2_base' );
	}
	else
	{
		if ( param.stat.is_vert )
			item.AddAttr( 'TYPE', 'vert_stat_items_base' );
		else
			item.AddAttr( 'TYPE', 'stat_items_base' );
	}
	
	item = rootItem.AddChild( 'INHERIT' );
	item.AddAttr( 'TYPE', 'stat_commands' );
}


function build_screen_dyn_filters_line( param, panel, dynFiltersArray, lineIndex )
{
	useButton = ( lineIndex == 0 );
	
	table = panel.AddChild( 'TABLE' );
	columns = table.AddChild( 'COLUMNS' );

	for ( dynFilter in dynFiltersArray )
	{
		if ( dynFilter.is_auto )
			continue;

		elem = get_dyn_filter_target_elem( param.stat, dynFilter );

		if ( dynFilter.data_type.HasValue )
			dataType = dynFilter.data_type;
		else if ( elem != undefined )
			dataType = elem.Type;
		else
			dataType = '';

		if ( dynFilter.title != '' )
			title = dynFilter.title;
		else if ( elem != undefined )
			title = elem.Title;
		else
			title = '';

		if ( dynFilter.foreign_array.HasValue )
			foreignArrayExpr = dynFilter.foreign_array;
		else if ( elem != undefined )
			foreignArrayExpr = elem.ForeignArrayExpr;
		else
			foreignArrayExpr = '';

		col = columns.AddChild( 'COL' );

		if ( dynFilter.width.HasValue )
		{
			widthMeasure = dynFilter.width;
		}
		else if ( param.stat.is_v2 && foreignArrayExpr != '' )
		{
			if ( ( vocInfo = lib_voc.get_opt_voc_info( foreignArrayExpr ) ) != undefined )
				widthMeasure = lib_voc.CalcVocElemSelectorWidthMeasureCore( lib_voc.get_voc_by_id( vocInfo.id ), vocInfo, title, 10, 40 );
			else if ( StrContains( foreignArrayExpr, 'common.' ) )
				widthMeasure = lib_base.CalcElemSelectorWidthMeasureCore( eval( foreignArrayExpr ), title, 10, 40 );
			else if ( foreignArrayExpr == 'users' )
				widthMeasure = '26zr';
			else if ( foreignArrayExpr == 'groups' )
				widthMeasure = '22zr';
			else
				widthMeasure = '30zr';
		}
		else
		{
			if ( elem != undefined && elem.ExpMaxLen != null )
				len = Max( elem.ExpMaxLen + 8, StrCharCount( title ) + 3 );
			else if ( elem != undefined && elem.ForeignArrayExpr == '' && elem.Type == 'integer' )
				len = 7;
			else if ( dataType == 'date' )
				len = 14;
			else if ( elem != undefined && elem.Type == 'bool' )
				len = StrLen( title ) + 5;
			else
				len = 30;

			if ( dynFilter.use_range )
				len = len * 2 + 1;

			if ( dynFilter.use_period_quick_selector )
				len += 4;

			widthMeasure = len + 'zr';
		}

		col.AddAttr( 'WIDTH', widthMeasure );
	}

	if ( useButton )
	{
		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', '100%' );

		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', '15zr' );
	}

	for ( dynFilter in dynFiltersArray )
	{
		if ( dynFilter.is_auto )
			continue;

		elem = get_dyn_filter_target_elem( param.stat, dynFilter );

		if ( dynFilter.data_type.HasValue )
			dataType = dynFilter.data_type;
		else if ( elem != undefined )
			dataType = elem.Type;
		else
			dataType = '';


		if ( dynFilter.title != '' )
			title = dynFilter.title;
		else if ( elem != undefined )
			title = elem.Title;
		else
			title = '';

		if ( dynFilter.foreign_array.HasValue )
			foreignArrayExpr = dynFilter.foreign_array;
		else if ( elem != undefined )
			foreignArrayExpr = elem.ForeignArrayExpr;
		else
			foreignArrayExpr = '';

		panel = table.AddChild( 'PANEL' );

		if ( dataType != 'bool' || foreignArrayExpr != '' )
		{
			item = panel.AddChild( 'LABEL' );
			item.AddAttr( 'TITLE', title + ':' );
		}

		if ( dynFilter.use_range )
		{
			subTable = panel.AddChild( 'TABLE' );
			subTable.AddAttr( 'SPACING', 'short' );

			columns = subTable.AddChild( 'COLUMNS' );

			col = columns.AddChild( 'COL' );
			col.AddAttr( 'WIDTH', '50%' );

			col = columns.AddChild( 'COL' );
			col.AddAttr( 'WIDTH', '50%' );

			if ( dynFilter.use_period_quick_selector )
			{
				col = columns.AddChild( 'COL' );
				col.AddAttr( 'WIDTH', 'button' );
			}

			if ( dataType == 'date' )
			{
				item = subTable.AddChild( 'ITEM' );
				item.AddAttr( 'TYPE', 'date_selector' );
			}
			else
			{
				item = subTable.AddChild( 'EDIT' );
			}
			
			item.AddAttr( 'SOURCE', 'Ps.filter.min_' + path_to_filter_elem_name( dynFilter.id ) );
			item.AddAttr( 'UPDATE-ACTION', 'lib_view.store_filter_elem( ' + CodeLiteral( param.stat.id ) + ', Source )' );

			if ( dataType == 'date' )
			{
				item = subTable.AddChild( 'ITEM' );
				item.AddAttr( 'TYPE', 'date_selector' );
			}
			else
			{
				item = subTable.AddChild( 'EDIT' );
			}

			item.AddAttr( 'SOURCE', 'Ps.filter.max_' + path_to_filter_elem_name( dynFilter.id ) );
			item.AddAttr( 'UPDATE-ACTION', 'lib_view.store_filter_elem( ' + CodeLiteral( param.stat.id ) + ', Source )' );

			if ( dynFilter.use_period_quick_selector )
			{
				item = subTable.AddChild( 'ITEM' );
				item.AddAttr( 'TYPE', 'period_quick_selector' );
				item.AddAttr( 'SOURCE', 'Ps.filter.min_' + path_to_filter_elem_name( dynFilter.id ) );
			}
		}
		else if ( dynFilter.use_range_min )
		{
			if ( elem != undefined && elem.Type == 'date' )
			{
				item = panel.AddChild( 'ITEM' );
				item.AddAttr( 'TYPE', 'date_selector' );
			}
			else
			{
				item = panel.AddChild( 'EDIT' );
			}
			
			item.AddAttr( 'SOURCE', 'Ps.filter.min_' + path_to_filter_elem_name( dynFilter.id ) );
			item.AddAttr( 'UPDATE-ACTION', 'lib_view.store_filter_elem( ' + CodeLiteral( param.stat.id ) + ', Source )' );
		}
		else
		{
			if ( dynFilter.target_values.ChildNum != 0 )
			{
				item = panel.AddChild( 'COMBO' );
			}
			else if ( foreignArrayExpr != '' )
			{
				item = panel.AddChild( 'ITEM' );

				if ( lib_voc.get_opt_voc_info( foreignArrayExpr ) != undefined )
					item.AddAttr( 'TYPE', 'voc_elem_selector' );
				else if ( DefaultDb.GetOptCatalog( foreignArrayExpr ) != undefined )
				{
					item.AddAttr( 'TYPE', 'object_selector' );

					if ( dynFilter.view_filter_expr.HasValue )
						item.AddAttr( 'view-filter-expr', 'with ( Ps ) { return ' + dynFilter.view_filter_expr + '; }' );

					if ( dynFilter.source_id.HasValue )
					{
						if ( lib_base.has_catalog_filter_constraints( dynFilter.source_id, dynFilter.id ) )
							item.AddAttr( 'CHECK-VALUE-ACTION', 'lib_base.check_catalog_filter_constraints( \'' + dynFilter.source_id + '\', \'' + dynFilter.id + '\', NewValue )' );
					}
				}
				else
					item.AddAttr( 'TYPE', 'elem_selector' );

				item.AddAttr( 'usage', 'filter' );
			}
			else if ( dataType == 'bool' )
			{
				if ( param.stat.is_v2 )
				{
					item = panel.AddChild( 'ITEM' );
					item.AddAttr( 'TYPE', 'tri_state_selector' );
					item.AddAttr( 'LABEL-TITLE', title + ':' );
				}
				else
				{
					item = panel.AddChild( 'PANEL' );
					item.AddAttr( 'HEIGHT', '3zrc' );

					item = panel.AddChild( 'CHECK' );
					item.AddAttr( 'TITLE', title );
				}
			}
			else
			{
				item = panel.AddChild( 'EDIT' );
			}
			
			item.AddAttr( 'SOURCE', 'Ps.filter.' + path_to_filter_elem_name( dynFilter.id ) );
			
			if ( param.stat.is_v2 && dynFilter.is_spec_modifier )
				item.AddAttr( 'UPDATE-ACTION', 'lib_stat_v2.OnFilterChanged( Ps, ' + CodeLiteral( dynFilter.id ) + ', Source )' );
			else
				item.AddAttr( 'UPDATE-ACTION', 'lib_view.store_filter_elem( ' + CodeLiteral( param.stat.id ) + ', Source )' );

			for ( targetValue in dynFilter.target_values )
			{
				comboEntry = item.AddChild( 'COMBO-ENTRY' );

				if ( dynFilter.data_type == 'integer' )
					comboEntry.AddAttr( 'VALUE-EXPR', ( targetValue.id.HasValue ? targetValue.id : 'null' ) );
				else
					comboEntry.AddAttr( 'VALUE', targetValue.id );

				comboEntry.AddAttr( 'TITLE', targetValue.name );
			}
		}
	}

	if ( useButton )
	{
		panel = table.AddChild( 'PANEL' );

		panel = table.AddChild( 'PANEL' );

		item = panel.AddChild( 'LABEL' );
		item.AddAttr( 'TITLE', ' ' );

		button = panel.AddChild( 'BUTTON' );
		button.AddAttr( 'TITLE', UiText.actions.show );
		button.AddAttr( 'IMAGE-URL', '//base_pict/start.ico' );
		button.AddAttr( 'STD-MARGINS', '0' );
		button.AddAttr( 'ACTION', 'lib_stat.calc_stat_result( Ps )' );
	}
}


function build_stat_param( statID )
{
	stat = GetOptForeignElem( stats, statID );
	if ( stat == undefined )
		throw UserError( 'Stat not registered: ' + statID );

	//alert( statID + ' ' + stat.fields.ChildNum );
	
	param = new Object;
	param.stat = stat;

	//param.mainCatalogName = param.stat.sources[0].catalog_name;
	//param.mainObjectName = lib_base.catalog_name_to_object_name( param.mainCatalogName );
	//param.mainObjectForm = DefaultDb.GetObjectForm( param.mainObjectName );
	//param.mainRecordForm = lib_base.get_catalog_form_record( eval( param.mainCatalogName ) );

	for ( dynFilter in ArraySelectAll( param.stat.dyn_filters ) )
	{
		if ( dynFilter.exist_req_expr.HasValue && ! eval( dynFilter.exist_req_expr ) )
			dynFilter.Delete();
	}

	return param;
}


function get_dyn_filter_target_elem( spec, dynFilter )
{
	if ( ! dynFilter.source_id.HasValue )
		return undefined;

	if ( spec.is_v2 )
	{
		catalog = DefaultDb.GetOptCatalog( dynFilter.source_id );
		formRecord = lib_base.get_catalog_form_record( catalog );
	}
	else
	{
		formRecord = get_source_form_record( spec.sources.GetChildByKey( dynFilter.source_id ) );
	}

	if ( ! formRecord.PathExists( dynFilter.id ) )
	{
		if ( dynFilter.xquery_qual_expr.HasValue )
			return undefined;

		throw 'Invalid dynamic filter path: ' + dynFilter.id;
	}

	return formRecord.EvalPath( dynFilter.id );
}


function get_dyn_filter_elem_names( dynFilter, elem )
{
	array = new Array;

	if ( dynFilter.use_range )
	{
		array[array.length] = 'min_' + path_to_filter_elem_name( dynFilter.id );
		array[array.length] = 'max_' + path_to_filter_elem_name( dynFilter.id );
	}
	else if ( dynFilter.use_range_min )
	{
		array[array.length] = 'min_' + path_to_filter_elem_name( dynFilter.id );
	}
	else
	{
		array[array.length] = path_to_filter_elem_name( dynFilter.id );
	}

	return array;
}


function path_to_filter_elem_name( path )
{
	return StrReplace( path, '.', '__' );
}


function build_xquery_qual( dest, sourceSpec )
{
	param = build_stat_param( dest.stat_id );

	xqueryQual = '';

	for ( staticFilter in dest.spec.static_filters )
	{
		if ( staticFilter.source_id != sourceSpec.id )
			continue;

		formRecord = get_source_form_record( dest.spec.sources.GetChildByKey( staticFilter.source_id ) );
		if ( ! formRecord.ChildExists( staticFilter.id ) )
			throw 'No such field: ' + staticFilter.id;

		elem = formRecord.Child( staticFilter.id );

		if ( elem.IsMultiple && staticFilter.cmp_pred == 'equal' )
		{
			xqueryQual += ' and MatchSome( $elem/' + staticFilter.id + ', ';
		}
		else
		{
			xqueryQual += ' and $elem/' + staticFilter.id;
			
			switch ( staticFilter.cmp_pred )
			{
				case 'equal':
					xqueryQual += ' = ';
					break;
					
				case 'not_equal':
					xqueryQual += ' != ';
					break;

				case 'less':
					xqueryQual += ' < ';
					break;

				case 'less_or_equal':
					xqueryQual += ' <= ';
					break;

				case 'greater':
					xqueryQual += ' > ';
					break;

				case 'greater_or_equal':
					xqueryQual += ' >= ';
					break;
			}
		}

		if ( staticFilter.value_expr != '' )
		{
			value = eval( staticFilter.value_expr );
			xqueryQual += XQueryLiteral( value );
		}
		else
		{
			valueElem = CreateDynamicElem( 'v', ( elem.IsMethod ? 'string' : elem.Type ) );
			valueElem.XmlValue = staticFilter.value;

			xqueryQual += valueElem.XQueryLiteral;
		}

		if ( elem.IsMultiple && staticFilter.cmp_pred == 'equal' )
		{
			xqueryQual += ' )';
		}
	}

	xqueryQual += build_xquery_dyn_qual( dest, sourceSpec, '', '$elem' );
	//alert( xqueryQual );
	return xqueryQual;
}


function build_xquery_dyn_qual( dest, sourceSpec, joinCatalogName, varName )
{
	xqueryQual = '';

	for ( dynFilter in dest.spec.dyn_filters )
	{
		if ( dynFilter.source_id != sourceSpec.id )
			continue;

		elem = get_dyn_filter_target_elem( dest.spec, dynFilter );

		for ( filterElemName in get_dyn_filter_elem_names( dynFilter, elem ) )
		{
			if ( dynFilter.is_auto && ! source.PathExists( 'filter.' + filterElemName ) )
			{
				//alert( source.Name );
				filterElem = CreateDynamicElem( 't', 'integer' );
				filterElem.Value = source.Doc.DocID;
			}
			else
			{
				try
				{
					filterElem = GetObjectProperty( dest.filter, filterElemName );
				}
				catch( e )
				{
					//alert( filterElemName );
					throw e;
				}
			}

			if ( ! dynFilter.is_auto && ! filterElem.HasValue )
				continue;

			if ( dynFilter.xquery_qual_expr.HasValue )
			{
				for ( qualSpecExpr in dynFilter.xquery_qual_expr )
				{
					filter = dest.filter;
					subQual = eval( qualSpecExpr );

					if ( subQual != '' )
						xqueryQual = xqueryQual + ' and ' + subQual;
				}

				continue;
			}


			xqueryQual += ' and ';

			if ( dynFilter.use_foreign_rec_child )
			{
				xqueryQual += 'CatalogIsHierRecChild( \'' + elem.ForeignArrayExpr + '\',' + filterElem.XQueryLiteral + ', ';
				xqueryQual += varName + '/' + StrReplace( dynFilter.id, '.', '/' ) + ', true() )';
				continue;
			}

			if ( filterElem.IsMultiElem )
				xqueryQual += 'MatchSome( ';
			else if ( elem.IsMultiple )
				xqueryQual += 'MatchSome( ';
			//else if ( elem.Type == 'string' && elem.ForeignArrayStr == '' )
				//xqueryQual += 'contains( ';

			xqueryQual += varName + '/' + StrReplace( dynFilter.id, '.', '/' );

			if ( filterElem.IsMultiElem )
				xqueryQual += ', ';
			else if ( elem.IsMultiple )
				xqueryQual += ', ';
			else if ( StrBegins( filterElemName, 'min_' ) )
				xqueryQual += ' >= ';
			else if ( StrBegins( filterElemName, 'max_' ) )
				xqueryQual += ' <= ';
			else
				xqueryQual += ' = ';

			if ( StrBegins( filterElemName, 'max_' ) && filterElem.Type == 'date' && Hour( filterElem ) == undefined )
				xqueryQual += XQueryLiteral( DateNewTime( filterElem, 23, 59, 59 ) );
			else
				xqueryQual += filterElem.XQueryLiteral;

			if ( filterElem.IsMultiElem )
				xqueryQual += ' )';
			else if ( elem.IsMultiple )
				xqueryQual += ' )';
		}
	}

	//alert( xqueryQual );
	return xqueryQual;
}


function get_stored_stat( statID )
{
	storeDoc = FetchDoc( 'x-local://data_local/base1_views_stored_data.xml' );
	return storeDoc.TopElem.views.ObtainChildByKey( statID );
}


function load_stored_filters( statID, filters )
{
	storeDoc = FetchDoc( 'x-local://data_local/base1_views_stored_data.xml' );

	storedView = storeDoc.TopElem.views.GetOptChildByKey( statID );
	if ( storedView == undefined )
		return;

	for ( filterElem in filters )
	{
		storedElem = storedView.filter.OptChild( filterElem.Name );
		if ( storedElem == undefined )
			continue;

		filterElem.AssignElem( storedElem );
	}
}


function store_filter_elem( statID, filterElem )
{
	storedView = get_stored_stat( statID );

	storedElem = storedView.filter.OptChild( filterElem.Name );
	if ( storedElem == undefined )
		storedElem = storedView.filter.AddDynamicChild( filterElem.Name, filterElem.Type );

	storedElem.AssignElem( filterElem );

	storedView.Doc.SetChanged( true );
}









function init_stat_result( dest )
{
	if ( dest.stat_id.ForeignElem.is_v2 )
	{
		lib_stat_v2.InitStatResult( dest );
		return;
	}

	dest.spec.AssignElem( dest.stat_id.ForeignElem );

	for ( group in ArraySelectAll( dest.spec.groups ) )
	{
		if ( group.exist_req_expr.HasValue && ! eval( group.exist_req_expr ) )
			group.Delete();
	}

	for ( field in ArraySelectAll( dest.spec.fields ) )
	{
		if ( field.exist_req_expr.HasValue && ! eval( field.exist_req_expr ) )
			field.Delete();
	}

	for ( i = 0; i < dest.spec.fields.ChildNum; i++ )
	{
		field = dest.spec.fields[i];

		if ( field.auto_loop_expr != '' )
		{
			array = eval( field.auto_loop_expr );
			j = 0;

			for ( elem in array )
			{
				newField = dest.spec.fields.InsertChild( i + j + 1 );
				newField.AssignElem( field );

				newField.col_title_expr = StrReplace( newField.col_title_expr, '::ListElem', elem );
				newField.stat_qual = StrReplace( newField.stat_qual, '::ListElem', elem );

				j++;
			}

			field.Delete();
			i +=  j - 1;
		}
	}


	dest.header_columns.Clear();

	for ( field in dest.spec.fields )
	{
		headerColumn = dest.header_columns.AddChild();

		elem = undefined;

		if ( field.id.HasValue && dest.spec.sources.ChildNum != 0 && field.source_id != '*' )
		{
			formRecord = get_field_source_form_record( dest, field );
			if ( ! formRecord.PathExists( field.id ) )
				throw 'No such field: ' + field.id;

			elem = formRecord.EvalPath( field.id );
		}

		if ( elem != undefined )
			headerColumn.elem_ref = elem;

		if ( field.col_title_expr.HasValue )
			headerColumn.title = eval( field.col_title_expr );
		else if ( field.col_title.HasValue )
			headerColumn.title = field.col_title;
		else if ( elem != undefined && elem.ColTitle != '' )
			headerColumn.title = elem.ColTitle;
		else if ( elem != undefined )
			headerColumn.title = elem.Title;
			
		if ( field.tip_text.HasValue )
			headerColumn.tip_text = field.tip_text;
		else if ( elem != undefined && elem.Title != headerColumn.title )
			headerColumn.tip_text = elem.Title;

		if ( field.data_type.HasValue )
			headerColumn.data_type = field.data_type;
		else if ( elem != undefined && elem.ForeignArrayExpr == '' )
			headerColumn.data_type = elem.Type;
		else if ( field.stat_func.HasValue )
			headerColumn.data_type = 'integer';
		else if ( field.is_percent )
			headerColumn.data_type = 'integer';

		if ( field.width.HasValue )
		{
			headerColumn.width = field.width;
		}
		else
		{
			if ( elem != undefined && ( colLen = lib_base.get_field_default_col_len( elem ) ) != null )
			{
				if ( field.use_time )
					colLen += 6;

				if ( field.time_only )
					colLen = 6;
			}
			else if ( field.is_percent )
			{
				colLen = 5;
			}
			else if ( headerColumn.data_type == 'integer' )
			{
				colLen = 6;
			}
			else
			{
				colLen = 2;
			}

			if ( headerColumn.title != '' )
			{
				colTitleLen = StrLen( ArrayMax( String( UnifySpaces( headerColumn.title ) ).split( ' ' ), 'StrLen( This )' ) );
				colTitleLen += 1;
				if ( colLen < colTitleLen )
					colLen = colTitleLen;

				//alert( headerColumn.title + ' ' + colTitleLen + ' ' + colLen );
			}

			headerColumn.width = ( colLen + 1 ) + 'zr';
		}

		if ( field.align.HasValue )
			headerColumn.align = field.align;
		else if ( field.is_percent )
			headerColumn.align = 'center';
		else if ( headerColumn.data_type == 'integer' && ( elem == undefined || elem.ForeignArrayExpr == '' || field.stat_func.HasValue ) )
			headerColumn.align = 'right';
		else if ( headerColumn.data_type == 'real' )
			headerColumn.align = 'right';
		else if ( headerColumn.data_type == 'date' )
			headerColumn.align = 'center';
	}


	dest.top_columns.Clear();

	if ( ArrayOptFind( dest.spec.fields, 'keep_to_prev' ) != undefined )
	{
		topColumn = undefined;

		for ( i = 0; i < dest.spec.fields.ChildNum; i++ )
		{
			field = dest.spec.fields[i];

			if ( field.keep_to_prev && topColumn != undefined )
			{
				topColumn.span++;
				continue;
			}

			topColumn = dest.top_columns.AddChild();

			if ( field.span_title != '' )
			{
				topColumn.title = field.span_title;
				topColumn.tip_text = field.span_tip_text;
			}
			else
			{
				headerColumn = dest.header_columns[i];

				topColumn.title = headerColumn.title;
				topColumn.tip_text = headerColumn.tip_text;

				headerColumn.title = '';
				headerColumn.tip_text = '';
			}
		}
	}

	if ( dest.spec.before_init_action != '' )
	{
		with ( dest )
		{
			eval( dest.spec.before_init_action );
		}
	}

	//if ( dest.spec.is_v2 )
		//lib_stat_v2.InitFilterValues();
}


function get_field_source_form_record( dest, field )
{
	if ( field.source_id.HasValue )
		sourceSpec = dest.spec.sources.GetChildByKey( field.source_id );
	else
		sourceSpec = dest.spec.sources[0];

	return get_source_form_record( sourceSpec )
}


function get_source_form_record( sourceSpec )
{
	catalog = eval( sourceSpec.id );
	return lib_base.get_catalog_form_record( catalog );
}





"META:ALLOW-CALL-FROM-CLIENT:1";
function calc_stat_result_srv_prepare( statID )
{
	obtain_stat_url( statID );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function calc_stat_result_srv( destDoc )
{
	dest = destDoc.TopElem;
	dest.is_running_on_server = true;

	init_stat_result( dest );
	calc_stat_result( dest );
	
	resObj = new Object;
	resObj.items = EncodeItemsToObject( dest, dest.items );
	resObj.total = EncodeItemToObject( dest, dest.total );
	
	if ( dest.idxColRef.HasValue )
		resObj.idxColRef = dest.idxColRef.OptObject;

	resObj.chart_page_html = dest.chart_page_html;
	resObj.chart_page_script = dest.chart_page_script;

	return EncodeJson( resObj, {ExportLargeIntegersAsStrings:true} );
}


function EncodeItemsToObject( dest, items )
{
	destArray = new Array;

	for ( item in items )
	{
		resItem = EncodeItemToObject( dest, item );
		destArray.push( resItem );
	}

	return destArray;
}


function EncodeItemToObject( dest, item )
{
	resItem = new Object;
	if ( item.Name != 'total' && item.id.HasValue )
		resItem.id = '0x' + StrHexInt( item.id, 16 );
	resItem.columns = new Array;

	for ( column in item.columns )
	{
		headerColumn = dest.header_columns[column.ChildIndex];

		resColumn = new Object;

		if ( DataType( column.value.Value ) == 'date' )
		{
			resColumn.value = StrDate( column.value, false );
		}
		else if ( item.record_ref.HasValue && headerColumn.elem_ref.HasValue && headerColumn.elem_ref.Object.ForeignArrayExpr != '' )
		{
			record = item.record_ref.Object;
			elem = record.OptChild( headerColumn.elem_ref.Object.Name );
				
			if ( elem != undefined )
			{
				if ( headerColumn.elem_ref.Object.IsMultiple )
				{
					resColumn.value = elem.MultiElem.ForeignDispName;
				}
				else
				{
					resColumn.value = elem.ForeignDispName;
				}
			}
		}
		else
		{
			resColumn.value = RValue( column.value );
		}

		if ( column.is_link )
			resColumn.is_link = true;

		if ( column.bk_color.HasValue )
			resColumn.bk_color = column.bk_color.Value;

		if ( item.Name != 'total' && column.unique_keys_ref.HasValue )
			resColumn.unique_keys_ref = column.unique_keys_ref.Value;

		resItem.columns.push( resColumn );
	}

	resItem.group_level = item.group_level;

	if ( item.Name != 'total' && item.items.ChildNum != 0 )
		resItem.items = EncodeItemsToObject( dest, item.items );

	return resItem;
}


function DecodeItemsFromObject( items, srcItems )
{
	for ( srcItem in srcItems )
	{
		item = items.AddChild();
		DecodeItemFromObject( item, srcItem );
	}
}


function DecodeItemFromObject( item, srcItem )
{
	if ( srcItem.HasProperty( 'id' ) )
		item.id = srcItem.id;

	for ( resColumn in srcItem.columns )
	{
		column = item.columns.AddChild();
			
		if ( resColumn.HasProperty( 'value' ) )
			column.value = resColumn.value;

		if ( resColumn.HasProperty( 'is_link' ) )
			column.is_link = resColumn.is_link;

		if ( resColumn.HasProperty( 'bk_color' ) )
			column.bk_color = resColumn.bk_color;

		if ( resColumn.HasProperty( 'unique_keys_ref' ) )
			column.unique_keys_ref = resColumn.unique_keys_ref;
	}

	item.group_level = srcItem.group_level;

	if ( srcItem.HasProperty( 'items' ) )
		DecodeItemsFromObject( item.items, srcItem.items );
}


function calc_stat_result( dest )
{
	if ( dest.spec.is_v2 )
	{
		lib_stat_v2.CalcStatResult( dest );
		return;
	}

	//lib_base.check_desktop_client();
	//init_stat_result( dest );
	
	dest.sources.Clear();
	dest.items.Clear();
	dest.total.Clear();

	if ( System.IsWebClient /*&& AppModuleUsed( 'ws' )*/ )
	{
		CallServerMethod( 'lib_stat', 'calc_stat_result_srv_prepare', [RValue( dest.spec.id )] );
		
		
		task = new BackgroundTask;
		task.RunOnServer = true;
		task.ShowProgress = true;
	
		resVal = task.CallMethod( 'lib_stat', 'calc_stat_result_srv', [dest.Doc] );
		resObj = ParseJson( resVal );

		DecodeItemsFromObject( dest.items, resObj.items );
		DecodeItemFromObject( dest.total, resObj.total );

		if ( resObj.HasProperty( 'idxColRef' ) )
			dest.idxColRef = resObj.idxColRef;

		dest.chart_page_html = resObj.chart_page_html;
		dest.chart_page_script = resObj.chart_page_script;
		//DebugMsg( dest.chart_page_html );

		if ( dest.spec.show_chart )
		{
			//DebugMsg( dest.chart_page_script );
			EvalBrowserScript( dest.chart_page_script );
		}

		return;
	}

	if ( dest.spec.fields.ChildNum == 0 )
		throw UserError( UiText.errors.no_stat_fields_specified );

	dest.total.Clear();
	dest.total.init_columns();
	dest.total.set_base_column_values();
	
	if ( ! dest.spec.is_vert )
		dest.total.columns[0].value = RValue( UiText.titles.stat_total );

	dest.total_average.Clear();
	dest.total_average.init_columns();
	dest.total_average.set_base_column_values();

	if ( ! dest.spec.is_vert )
		dest.total_average.columns[0].value = UiText.titles.stat_average;

	for ( dynFilterMapping in dest.spec.dyn_filter_mappings )
	{
		dynFilter = dyn_filters.Child( dynFilterMapping.elem );

		if ( ! dynFilter.HasValue )
			continue;

		if ( dynFilterMapping.source_id != '' )
			sourceSpec = dest.spec.sources.GetChildByKey( dynFilterMapping.source_id );
		else
			sourceSpec = dest.spec.sources[0];

		qual = sourceSpec.xquery_qual.Add();
		qual.Value = '$elem/' + dynFilterMapping.elem + ' = ' + dynFilter.XQueryLiteral;
	}

	if ( dest.spec.init_action != '' )
	{
		with ( dest )
		{
			eval( dest.spec.init_action );
		}
	}

	if ( dest.spec.build_action != '' )
	{
		dest.idxColRef = new Object;

		index = 0;

		for ( field in dest.spec.fields )
		{
			if ( field.id.HasValue )
				dest.idxCol.SetProperty( field.id, index );

			index++;
		}

		with ( dest )
		{
			eval( dest.spec.build_action );
		}

		build_chart( dest );
		return;
	}

	if ( dest.spec.sources.ChildNum == 0 )
		throw UserError( UiText.errors.no_stat_sources_specified );

	for ( groupSpec in dest.spec.groups )
	{
		if ( groupSpec.show_full_range )
			build_group_full_range( dest, groupSpec );
	}
	
	for ( sourceSpec in dest.spec.sources )
		build_source( dest, sourceSpec );

	for ( sourceSpec in dest.spec.sources )
		process_source( dest, sourceSpec );

	adjust_items( dest, dest.items.Parent, 0 );
	finish_item_stat_values( dest, dest.total );
	finish_total_average_stat_values( dest, dest.total_average );
	//adjust_items2( dest, dest.items.Parent, 0 );

	recalc_items( dest, dest.items.Parent );
	recalc_item( dest, dest.total );
	recalc_item( dest, dest.total_average );

	if ( ! dest.spec.sources[0].stat_only )
		add_delim( dest.items.Parent );

	if ( dest.spec.finish_action != '' )
	{
		with ( dest )
		{
			eval( dest.spec.finish_action );
		}
	}

}



function build_group_full_range( dest, groupSpec )
{
	formRecord = get_source_form_record( dest.spec.sources[0] );
	elem = formRecord.Child( groupSpec.id );
	
	if ( elem == undefined || elem.ForeignArrayExpr == '' )
		throw 'Unable to get group full range';

	foreignArray = eval( elem.ForeignArrayExpr );

	build_group_full_range_level( dest, groupSpec, foreignArray, lib_base.get_catalog_empty_parent_id( foreignArray ), dest, 0 );
}

	
function build_group_full_range_level( dest, groupSpec, foreignArray, baseKeyVal, baseItem, level )
{
	if ( groupSpec.max_hier_level.HasValue && level >= groupSpec.max_hier_level )
		return;

	if ( groupSpec.is_hier )
		subArray = ArraySelectByKey( foreignArray, baseKeyVal, 'parent_id' );
	else
		subArray = foreignArray;

	for ( foreignElem in subArray )
	{
		groupKeyVal = foreignElem.PrimaryKey;

		item = baseItem.items.GetOptChildByKey( groupKeyVal );
		if ( item == undefined )
		{
			item = baseItem.items.AddChild();
			item.key_value = groupKeyVal;

			if ( groupSpec.title_expr != '' )
			{
				with ( envObject )
				{
					item.key_disp_value = eval( groupSpec.title_expr );
				}
			}
			else
			{
				item.key_disp_value = foreignElem.PrimaryDispName;
			}

			item.group_level = groupSpec.ChildIndex;
			item.init_columns();
			item.set_base_column_values();

			column = item.columns[0];
			column.value = item.key_disp_value;
			column.indent = item.group_level + level;
		}

		if ( groupSpec.is_hier )
			build_group_full_range_level( dest, groupSpec, foreignArray, foreignElem.PrimaryKey, item, level + 1 );
	}
}


function build_source( dest, sourceSpec )
{
	if ( sourceSpec.catalog_name == '' )
		throw UserError( UiText.errors.no_stat_source_catalog_specified );

	if ( sourceSpec.is_secondary )
	{
		build_secondary_source( dest, sourceSpec );
		return;
	}

	source = dest.sources.AddChild();
	source.id = sourceSpec.id;

	query = 'for $elem in ' + sourceSpec.catalog_name;
	
	qual = '';

	if ( sourceSpec.ChildIndex == 0 ) // !!! || dest.spec.dyn_filters.GetOptChildByKey( sourceSpec.id, 'source_id' ) != undefined )
		qual += build_xquery_qual( dest, sourceSpec );

	for ( qualSpec in sourceSpec.xquery_qual )
		qual = qual + ' and ' + qualSpec;

	for ( qualSpecExpr in sourceSpec.xquery_qual_expr )
	{
		filter = dest.filter;
		subQual = eval( qualSpecExpr );

		if ( subQual != '' )
			qual = qual + ' and ' + subQual;
	}

	if ( qual != '' )
	{
		if ( StrBegins( qual, ' and ' ) )
			qual = StrReplaceOne( qual, ' and ', ' where ' );

		query = query + qual;
	}

	query = query + ' return $elem';
	//alert( query );
	srcArray = XQuery( query );

	source.array_ref = srcArray;

	if ( sourceSpec.join_base != '' )
	{
		if ( ! sourceSpec.use_smart_join )
			source.array_ref = ArraySelectAll( srcArray );

		baseSourceSpec = dest.spec.sources.GetChildByKey( sourceSpec.join_base );
		//baseSource = sources[baseSourceSpec.ChildIndex];
	}
}


function build_secondary_source( dest, sourceSpec )
{
	source = dest.sources.AddChild();
	source.id = sourceSpec.id;

	baseSourceSpec = dest.spec.sources.GetChildByKey( sourceSpec.join_base );
	baseSource = dest.sources[baseSourceSpec.ChildIndex];

	srcArray = QueryCatalogByKeys( sourceSpec.catalog_name, ( sourceSpec.join_key != '' ? sourceSpec.join_key : 'id' ), ArraySelect( ArrayExtract( ArraySelectDistinct( baseSource.array_ref.Object, sourceSpec.join_base_key ), sourceSpec.join_base_key ), 'This != null' ) );

	source.array_ref = srcArray;
	source.blank_record_ref = CreateElem( '//base2/base2_user.xmd', 'user' );
	source.blank_record_ref.Object.login = '---';
}


function process_source( dest, sourceSpec )
{
	if ( sourceSpec.is_secondary )
		return;

	source = dest.sources[sourceSpec.ChildIndex];

	for ( record in source.array_ref.Object )
	{
		if ( sourceSpec.qual != '' )
		{
			with ( record )
			{
				//param = dyn_filters;
				match = eval( sourceSpec.qual );
			}

			if ( ! match )
				continue;
		}

		if ( sourceSpec.join_key == '' )
		{
			process_record( dest, record, sourceSpec, undefined );
		}
		else
		{
			keysArray = record.EvalMultiPath( sourceSpec.join_key );

			for ( keyVal in keysArray )
				process_record( dest, record, sourceSpec, keyVal );
		}
	}
}


function process_record( dest, record, sourceSpec, joinKeyVal )
{
	if ( sourceSpec.join_key.HasValue )
	{
		envObject = build_record_env( dest, record, sourceSpec );
		
		if ( sourceSpec.join_base_key.HasValue )
			item = ArrayOptFind( XmlArrayHier( dest.items ), 'record_ref.Object.' + sourceSpec.join_base_key + ' == ' + CodeLiteral( joinKeyVal ) );
		else
			item = ArrayOptFindByKey( XmlArrayHier( dest.items ), joinKeyVal, 'id' );

		if ( item == undefined )
			return;

		baseItem = item;
	}
	else
	{
		baseItem = bind_record_to_group( dest, record, sourceSpec );
		if ( baseItem == undefined )
			return;
	}

	if ( sourceSpec.join_merge_single )
	{
		item = baseItem;
	}
	else if ( sourceSpec.stat_only )
	{
		if ( dest.spec.id == 'vtbins_vacancies' )
			item = baseItem;
		else
			item = undefined;
	}
	else
	{
		item = baseItem.items.AddChild();
		item.id = record.Child( sourceSpec.id_field );
		item.record_ref = record;
		item.init_columns();
		item.set_base_column_values();
		item.columns[0].indent = dest.spec.groups.ChildNum;

		if ( dest.spec.groups.ChildNum == 0 && sourceSpec.join_key.HasValue )
			item.columns[0].indent = 1;
	}

	//update_upper_stat_count( dest, item );


	envObject = build_record_env( dest, record, sourceSpec );

	if ( sourceSpec.join_merge_single )
		envObject.AddProperty( item.record_ref.Object.Name, item.record_ref.Object );

	for ( field in dest.spec.fields )
	{
		if ( field.source_id.HasValue && field.source_id != '*' && field.source_id != sourceSpec.id )
			continue;

		if ( ! field.source_id.HasValue && sourceSpec.join_key.HasValue )
			continue;

		if ( field.stat_qual != '' )
		{
			with ( envObject )
			{
				with ( record )
				{
					try
					{
						match = eval( field.stat_qual );
					}
					catch ( e )
					{
						throw UserError( 'Error evaluating stat qual:' + '\r\n' + field.stat_qual + '\r\n\r\n' + e );
						alert( e );
						match = false;
					}
				}
			}

			if ( ! match )
				continue;
		}

		update_upper_stat_count( dest, baseItem, field );

		if ( field.elem_expr.HasValue )
			valExpr = field.elem_expr;
		else
			valExpr = field.id;

		with ( record )
		{
			with( envObject )
			{
				try
				{
					param = dest.filter;
					val = eval( valExpr );
				}
				catch ( e )
				{
					//alert( record.Xml );
					throw e;
					item.columns[field.ChildIndex].error_text = e;
					continue;
				}
			}
		}

		if ( field.stat_func == 'count' || field.stat_func == 'count_percent' )
			update_upper_count( dest, baseItem, field.ChildIndex, val );
		else if ( field.stat_func == 'unique_count' )
			update_upper_unique_count( dest, baseItem, field.ChildIndex, record, field );
		else if ( field.stat_func != '' )
			update_upper_sum( dest, baseItem, field.ChildIndex, val );

		if ( item != undefined && ( field.stat_func == '' || ! sourceSpec.join_merge_single ) )
		{
			if ( field.data_type == 'date' && val != null )
				val = DateNewTime( val );

			item.columns[field.ChildIndex].value = val;

			if ( field.text_color_expr != '' )
			{
				with ( record )
				{
					with( envObject )
					{
						try
						{
							item.columns[field.ChildIndex].text_color = eval( field.text_color_expr );
						}
						catch ( e )
						{
						}
					}
				}
			}
		}
	}
}



function process_sub_record_with_key( dest, record, sourceSpec, joinKeyVal )
{
	if ( joinKeyVal == null )
		return;

	envObject = build_record_env( dest, record, sourceSpec );
	
	if ( sourceSpec.join_base_key.HasValue )
		item = ArrayOptFind( XmlArrayHier( dest.items ), 'record_ref.Object.' + sourceSpec.join_base_key + ' == ' + CodeLiteral( joinKeyVal ) );
	else
		item = ArrayOptFindByKey( XmlArrayHier( dest.items ), joinKeyVal, 'id' );

	if ( item == undefined )
		return;

	baseItem = item;

	for ( field in dest.spec.fields )
	{
		if ( field.source_id != sourceSpec.id )
			continue;

		if ( field.stat_qual != '' )
		{
			with ( record )
			{
				try
				{
					match = eval( field.stat_qual );
				}
				catch ( e )
				{
					throw e;
					alert( e );
					match = false;
				}
			}

			if ( ! match )
				continue;
		}

		if ( field.elem_expr.HasValue )
			valExpr = field.elem_expr;
		else
			valExpr = field.id;

		with ( record )
		{
			with( envObject )
			{
				try
				{
					param = dest.filter;
					val = eval( valExpr );
				}
				catch ( e )
				{
					throw e;
					item.columns[field.ChildIndex].error_text = e;
					continue;
				}
			}
		}

		if ( field.stat_func == 'count' || field.stat_func == 'count_percent' )
			update_upper_count( dest, baseItem, field.ChildIndex, val );
		else if ( field.stat_func == 'unique_count' )
			update_upper_unique_count( dest, baseItem, field.ChildIndex, record, field );
		else if ( field.stat_func != '' )
			update_upper_sum( dest, baseItem, field.ChildIndex, val );

		//if ( RValue(item.columns[field.ChildIndex].value) == undefined )
			//item.columns[field.ChildIndex].value = 0;
	}
}






			

function bind_record_to_group( dest, record, sourceSpec )
{
	baseItem = dest;
	level = 0;

	for ( groupSpec in dest.spec.groups )
	{
		with ( record )
		{
			keyVal = eval( groupSpec.id );
			
			try
			{
				if ( keyVal.IsMultiElem )
					keyVal = ArrayFirstElem( keyVal );
			}
			catch ( e )
			{
				keyVal = null;
			}
		}

		if ( groupSpec.is_hier )
		{
			keyChain = lib_voc.voc_desc_implicit_chain( keyVal );
			//alert( ArrayMerge( keyChain, 'This', ' ' ) );

			if ( groupSpec.drop_root && ArrayCount( keyChain ) > 1 )
				keyChain = ArrayRange( keyChain, 1, ArrayCount( keyChain ) - 1 );

			if ( ArrayCount( keyChain ) == 0 )
				keyChain = [ keyVal ];
		}
		else
		{
			keyChain = [ keyVal ];
		}

		for ( keyVal in keyChain )
		{
			groupKeyVal = calc_group_key_value( groupSpec, keyVal );

			item = baseItem.items.GetOptChildByKey( groupKeyVal );
			if ( item == undefined && groupSpec.use_manual_range )
			{
				if ( baseItem === dest )
					return undefined;

				return baseItem;
			}

			if ( item == undefined && ! groupSpec.use_manual_range )
			{
				item = baseItem.items.AddChild();
				item.key_value = groupKeyVal;

				if ( groupSpec.title_expr != '' )
				{
					with ( build_record_env( dest, record, sourceSpec ) )
					{
						item.key_disp_value = eval( groupSpec.title_expr );
					}
				}
				else
				{
					item.key_disp_value = group_key_disp_value( groupSpec, groupKeyVal, record );
					if ( ( groupKeyVal == '' || groupKeyVal == null ) && item.key_disp_value == '' )
						item.key_disp_value = '---';
				}

				item.group_level = groupSpec.ChildIndex;
				item.init_columns();
				item.set_base_column_values();

				column = item.columns[0];
				column.value = item.key_disp_value;
				column.indent = item.group_level + level;
			}

			baseItem = item;
			level++;

			if ( groupSpec.max_hier_level.HasValue && level >= groupSpec.max_hier_level )
				break;
		}
	}

	return baseItem;
}


function build_record_env( dest, record, sourceSpec )
{
	envObject = new Object;
	param = dest.filter;

	envObject.Filter = dest.filter;
	envObject.SourceSpec = sourceSpec;

	for ( addField in sourceSpec.add_field )
	{
		with ( record )
		{
			addFieldVal = eval( addField.expr );
		}

		envObject.AddProperty( addField.id, addFieldVal );
	}

	for ( otherSourceSpec in dest.spec.sources )
	{
		if ( otherSourceSpec.is_secondary && otherSourceSpec.join_base == sourceSpec.id )
		{
			otherSource = dest.sources[otherSourceSpec.ChildIndex];

			with ( record )
			{
				joinKeyVal = eval( otherSourceSpec.join_base_key );
			}

			otherItem = ArrayOptFindByKey( otherSource.array_ref.Object, joinKeyVal, ( otherSourceSpec.join_key != '' ? otherSourceSpec.join_key : 'id' ) );
			if ( otherItem == undefined )
			{
				//alert( otherSourceSpec.id );
				otherItem = otherSource.blank_record_ref.Object;
			}

			envObject.AddProperty( otherSourceSpec.id, otherItem );
		}
	}
	
	return envObject;
}


function calc_group_key_value( groupSpec, value )
{
	switch ( groupSpec.range_sub_type )
	{
		case 'day':
			return DateNewTime( value );

		case 'month':
			return Month( value );

		case 'year_month':
			return Date( Year( value ), Month( value ), 1 );

		case 'year':
			return Year( value );

		default:
			return value;
	}
}


function update_upper_count( dest, baseItem, columnIndex, value )
{
	item = baseItem;

	while ( true )
	{
		if ( item.Name != 'item' )
			break;
		//if ( ! item.ChildExists( 'columns' ) )
			//alert( item.Name );

		column = item.columns[columnIndex];
		column.value++;

		item = item.Parent.Parent;
		if ( item.Name != 'item' )
			break;
	}

	column = dest.total.columns[columnIndex];
	column.value++;

	column = dest.total_average.columns[columnIndex];
	column.value++;
}


function update_upper_unique_count( dest, baseItem, columnIndex, record, field )
{
	with ( record )
	{
		try
		{
			keyVal = RValue( eval( field.unique_key ) );
		}
		catch ( e )
		{
			throw e;
		}
	}

	item = baseItem;

	while ( true )
	{
		if ( item.Name != 'item' )
			break;

		column = item.columns[columnIndex];
		
		if ( column.unique_keys_ref.HasValue )
		{
			uniqueKeys = column.unique_keys_ref.Object;

			if ( ArrayOptFind( uniqueKeys, 'This == keyVal' ) != undefined )
				return;
		}
		else
		{
			uniqueKeys = new Array();
			column.unique_keys_ref = uniqueKeys;
		}
		
		uniqueKeys[uniqueKeys.length] = keyVal;
		column.value = uniqueKeys.length;

		item = item.Parent.Parent;
		if ( item.Name != 'item' )
			break;
	}
}


function update_upper_sum( dest, baseItem, columnIndex, value )
{
	if ( value == undefined )
		return;

	if ( value == null )
		return;

	if ( value == false )
		return;

	if ( value == true )
		newValue = 1;
	else
		newValue = value;

	item = baseItem;

	while ( true )
	{
		if ( item.Name != 'item' )
			break;

		column = item.columns[columnIndex];
		column.value = column.value + newValue;

		item = item.Parent.Parent;
		if ( item.Name != 'item' )
			break;
	}

	column = dest.total.columns[columnIndex];
	column.value = column.value + newValue;

	column = dest.total_average.columns[columnIndex];
	column.value = column.value + newValue;
}


function update_upper_stat_count( dest, baseItem, field )
{
	if ( baseItem != undefined )
	{
		item = baseItem;

		while ( true )
		{
			if ( item.Name != 'item' )
				break;

			item.columns[field.ChildIndex].stat_count++;

			item = item.Parent.Parent;
			if ( item.Name != 'item' )
				break;
		}
	}

	dest.total.columns[field.ChildIndex].stat_count++;
	dest.total_average.columns[field.ChildIndex].stat_count++;
}



function adjust_items( dest, baseItem, groupIndex )
{
	if ( groupIndex < dest.spec.groups.ChildNum )
	{
		groupSpec = dest.spec.groups[groupIndex];

		fill_unused_items( baseItem, groupSpec );
		
		//if ( groupIndex == 0 )
			//alert( groupSpec.title_expr );
		
		if ( ! groupSpec.use_manual_range )
		{
			if ( groupSpec.title_expr != '' )
				baseItem.items.Sort( 'key_disp_value', '+' );
			else
				baseItem.items.Sort( 'key_value', '+' );
		}
	}
	else
	{
		baseItem.items.Sort( 'columns[0].value', '+', 'columns[1].value', '+' );
	}

	for ( item in baseItem.items )
	{
		adjust_items( dest, item, groupIndex + 1 );
		finish_item_stat_values( dest, item );
	}
}


function adjust_items2( dest, baseItem, groupIndex )
{
	if ( groupIndex >= dest.spec.groups.ChildNum )
		return;

	for ( item in baseItem.items )
		finish_item_stat_values2( dest, item );
}


function fill_unused_items( baseItem, groupSpec )
{
	if ( groupSpec.range_sub_type == '' )
		return;

	if ( baseItem.items.ChildNum == 0 )
		return;

	minKeyValue = ArrayMin( baseItem.items, 'key_value' ).key_value;
	maxKeyValue = ArrayMax( baseItem.items, 'key_value' ).key_value;

	for ( keyValue in build_range_keys( minKeyValue, maxKeyValue, groupSpec.range_sub_type ) )
	{
		item = baseItem.items.ObtainChildByKey( keyValue );
		if ( item.columns.ChildNum == 0 )
		{
			item.group_level = groupSpec.ChildIndex;
			item.init_columns();
			item.set_base_column_values();
		}
	}
}


function finish_item_stat_values( dest, item )
{
	for ( field in dest.spec.fields )
	{
		if ( field.stat_func == '' || ( field.stat_only && item.group_level == null ) )
			continue;

		if ( item.columns[field.ChildIndex].value == null )
			continue;

		if ( field.stat_func == 'average' && item.columns[field.ChildIndex].stat_count > 0 )
		{
			item.columns[field.ChildIndex].value /= item.columns[field.ChildIndex].stat_count;
		}
		else if ( field.stat_func == 'count_percent' )
		{
			totalCount = dest.total.columns[field.ChildIndex].value;
			if ( totalCount == 0 )
				continue;

			item.columns[field.ChildIndex].value = ( item.columns[field.ChildIndex].value * 100 ) / totalCount;
		}
		else if ( field.stat_func == 'match_percent' && item.columns[field.ChildIndex].stat_count != 0 )
		{
			item.columns[field.ChildIndex].value = ( item.columns[field.ChildIndex].value * 100 ) / item.columns[field.ChildIndex].stat_count;
		}
	}
}


function finish_total_average_stat_values( dest, item )
{
	for ( field in dest.spec.fields )
	{
		if ( field.stat_func == '' || ( field.stat_only && item.group_level == null ) )
			continue;

		if ( item.columns[field.ChildIndex].stat_count != 0 )
			item.columns[field.ChildIndex].value /= item.columns[field.ChildIndex].stat_count;
	}
}


function recalc_items( dest, baseItem )
{
	for ( item in baseItem.items )
	{
		recalc_item( dest, item );
		recalc_items( dest, item );
	}
}


function recalc_item( dest, item )
{
	refEnv = build_item_ref_env( dest, item );

	for ( field in dest.spec.fields )
	{
		column = item.columns[field.ChildIndex];

		if ( field.expr != '' )
		{
			with ( refEnv )
			{
				try
				{
					val = eval( field.expr );
				}
				catch ( e )
				{
					throw e;
					val = null;
				}
			}

			column.value = val;
		}

		if ( field.bk_color_expr != '' )
		{
			with ( item.record_ref.OptObject )
			{
				try
				{
					column.bk_color = eval( field.bk_color_expr );
				}
				catch ( e )
				{
					//alert( e );
				}
			}
		}
	}
}


function build_item_ref_env( dest, item )
{
	env = new Object();

	for ( field in dest.spec.fields )
	{
		if ( ! field.ref_id.HasValue )
			continue;

		column = item.columns[field.ChildIndex];

		env.AddProperty( field.ref_id, column.value );
	}

	return env;
}


function add_delim( baseItem )
{
	for ( item in baseItem.items )
	{
		if ( item.group_level == null )
			continue;

		delim = item.items.AddChild();
		delim.is_delim = true;
	}
}


function build_range_keys( minKeyValue, maxKeyValue, rangeSubType )
{
	if ( rangeSubType == 'day' )
	{
		size = DateDiff( maxKeyValue, minKeyValue ) / 86400 + 1;
		array = new Array( size );

		curKeyValue = minKeyValue;

		for ( i = 0; i < size; i++ )
		{
			array[i] = curKeyValue;
			curKeyValue = DateOffset( curKeyValue, 86400 );
		}

		return array;
	}
	else if ( rangeSubType == 'year_month' )
	{
		size = ( ( Year( maxKeyValue ) * 12 + Month( maxKeyValue ) ) - ( Year( minKeyValue ) * 12 + Month( minKeyValue ) ) ) + 1;
		array = new Array( size );

		curCombMonth = Year( minKeyValue ) * 12 + Month( minKeyValue ) - 1;

		for ( i = 0; i < size; i++ )
		{
			array[i] = RValue( Date( curCombMonth / 12, curCombMonth % 12 + 1, 1 ) );
			curCombMonth++;
		}

		return array;
	}
	else if ( rangeSubType == 'month' )
	{
		//alert( minKeyValue + ' ' + maxKeyValue );
		//minKeyValue = 1;
		//maxKeyValue = 12;

		size = ( maxKeyValue - minKeyValue ) + 1;
		array = new Array( size );

		curMonth = minKeyValue;

		for ( i = 0; i < size; i++ )
		{
			array[i] = curMonth;
			curMonth++;
		}

		return array;
	}
	else if ( rangeSubType == 'year' )
	{
		size = ( maxKeyValue - minKeyValue ) + 1;
		array = new Array( size );

		curYear = minKeyValue;

		for ( i = 0; i < size; i++ )
		{
			array[i] = curYear;
			curYear++;
		}

		return array;
	}
	else
	{
		throw 'Unknown rangeSubType';
	}
}


function group_key_disp_value( groupSpec, keyValue, record )
{
	switch ( groupSpec.range_sub_type )
	{
		case 'day':
			return keyValue;

		case 'year_month':
			return base1_common.months[Month( keyValue ) - 1].name + ' ' + Year( keyValue );

		case 'month':
			return base1_common.months[keyValue - 1].name;

		case 'year':
			return keyValue;
	}

	elem = record.OptChild( groupSpec.id );
	if ( elem != undefined && elem.FormElem.ForeignArrayExpr != '' )
	{
		return GetForeignElem( elem.ForeignArray, keyValue ).PrimaryDispName;
		//return elem.ForeignDispName;
	}

	return keyValue;
}


function open_item( dest, item )
{
	if ( dest.spec.open_action != '' )
	{
		eval( dest.spec.open_action );
		return;
	}

	if ( ! item.ChildExists( 'id' ) )
		Cancel();

	if ( ! item.record_ref.HasValue )
		Cancel();

	ObtainDocScreen( DefaultDb.GetRecordPrimaryObjectUrl( item.record_ref.Object ) );
}


function open_item_link( dest, item, column )
{
	eval( dest.spec.open_link_action );
}


function adjust_filters( statID, dest )
{
	param = build_stat_param( dest.stat_id );

	for ( dynFilter in param.stat.dyn_filters )
	{
		if ( dynFilter.is_multiple )
		{
			if ( ! dynFilter.source_id.HasValue )
				continue;

			multiElem = GetObjectProperty( dest.filter, ArrayFirstElem( get_dyn_filter_elem_names( dynFilter ) ) );

			if ( DefaultDb.GetOptCatalog( multiElem.FormElem.ForeignArrayExpr ) == undefined )
				continue;
			
			if ( ! lib_base.has_catalog_filter_constraints( dynFilter.source_id, dynFilter.id ) )
				continue;

			for ( elem in ArraySelectAll( multiElem ) )
			{
				if ( ! lib_base.match_catalog_filter_constraints( dynFilter.source_id, dynFilter.id, elem.Value ) )
					elem.Delete();
			}

			if ( ArrayCount( multiElem ) == 0 )
			{
				lib_base.adjust_catalog_filter_with_constraint( dynFilter.source_id, dynFilter.id, multiElem );
			}
		}
		else
		{
			elem = dest.filter.Child( ArrayFirstElem( get_dyn_filter_elem_names( dynFilter ) ) )

			if ( DefaultDb.GetOptCatalog( elem.FormElem.ForeignArrayExpr ) != undefined && lib_base.has_catalog_filter_constraints( dynFilter.source_id, dynFilter.id ) )
			{
				if ( ! lib_base.match_catalog_filter_constraints( dynFilter.source_id, dynFilter.id, elem.Value ) )
					lib_base.adjust_catalog_filter_with_constraint( dynFilter.source_id, dynFilter.id, elem );
			}
		}
	}
}


function show_screen_in_calc( screen )
{
	if ( base1_config.use_legacy_excel_export )//AppConfig.GetOptProperty( 'new-stat-excel-export' ) == '1' )
	{
		ShowLegacyScreenInExcel( screen );
		return;
	}

	dest = screen.Doc.TopElem;

	if ( System.IsWebClient || System.ClientMajorVersion >= 2 )
	{
		list = screen.FindOptItemByType( 'LIST' );
		if ( list == undefined )
			list = screen.FindOptItemByType( 'GRID' );
		if ( list == undefined )
			return;

		ui_client.ShowListInExcel( list );
		return;
	}

	lib = OpenCodeLib( 'base1_lib_stat_excel.js' );
	tempFileUrl = ObtainSessionTempFile( '.xlsx' );
	lib.ExportStatToExcelFile( dest, tempFileUrl );
	ShellExecute( 'open', tempFileUrl );
}


function ShowLegacyScreenInExcel( screen )
{
	dest = screen.Doc.TopElem;

	list = screen.FindOptItemByType( 'LIST' );
	if ( list == undefined )
		list = screen.FindOptItemByType( 'GRID' );
	if ( list == undefined )
		return;


	hasOwnFormat = ( dest.spec.print_format.build_tag_attr() != '' );

	destStream = new BufStream;

	destStream.WriteStr( '<SPXML-PRINT LANDSCAPE="1">\r\n' );
	
	if ( ! hasOwnFormat )
		destStream.WriteStr( '<FORMAT FONT-NAME="Arial" FONT-SIZE="8" SPACE-BEFORE="2" SPACE-AFTER="2">\r\n' );

	destStream.WriteStr( list.MakeReport() );

	if ( ! hasOwnFormat )
		destStream.WriteStr( '</FORMAT>' );

	destStream.WriteStr( '</SPXML-PRINT>' );


	reportStr = destStream.DetachStr();

	if ( dest.spec.print_template.file_path.HasValue )
	{
		lib_office.show_report_in_calc_template( reportStr, dest.spec.print_template.file_path, dest.spec.print_template.base_range );
	}
	else if ( dest.spec.print_template.file_name.HasValue )
	{
		templateFilePath = UrlToFilePath( ObtainSessionTempFile( UrlPathSuffix( dest.spec.print_template.file_name ) ) );
		PutFileData( templateFilePath, dest.spec.print_template.file_data );

		lib_office.show_report_in_calc_template( reportStr, templateFilePath, dest.spec.print_template.file_data );
	}
	else
	{
		lib_office.show_report_in_calc( reportStr );
	}
}


function build_chart( dest )
{
	if ( ! dest.spec.show_chart )
		return;

	env = new Object;
	env.chartData = dest.chart_data_ref.Object;

	if ( dest.is_running_on_server )
	{
		dest.chart_page_html = EvalCodePageUrl( 'x-app://base1/base1_stat_chart_fragment.htm', 'strict-errors=1' );
		dest.chart_page_script = EvalCodePageUrl( 'x-app://base1/base1_stat_chart_fragment.js', 'strict-errors=1' );
		return;
	}

	env.scriptUrl = FilePathToUrl( FilePath( FilePath( FilePath( AppDirectoryPath(), "misc" ), "chart" ), 'chart.js' ) );

	htmlStr = EvalCodePageUrl( 'x-app://base1/base1_stat_chart.htm', 'strict-errors=1' );
	//DebugMsg( htmlStr );


	tempUrl = ObtainSessionTempFile( '.htm' );
	PutUrlData( tempUrl, htmlStr );

	dest.chart_page_url = tempUrl;

	hyper = dest.Screen.FindItem( 'ChartHyper' );
	hyper.Navigate( dest.chart_page_url );
}