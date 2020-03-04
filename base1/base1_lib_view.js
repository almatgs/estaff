function obtain_view_url( viewID, extQuery )
{
	viewUrl = 'x-app://base1/base1_generic_view.xml?id=' + viewID;
	if ( extQuery != undefined )
		viewUrl += '&' + extQuery;

	if ( GetOptCachedDoc( viewUrl ) != undefined )
		return viewUrl;

	//DebugMsg( viewUrl );
	param = build_view_param( viewID, extQuery );
	
	form = RegisterFormFromStr( viewUrl, '<SPXML-FORM><generic_view></generic_view></SPXML-FORM>' );
	build_form( param, false, form );

	screenFormData = build_screen_form( param, false );
	//DebugMsg( screenFormData );
	PutUrlData( 'x-local://Logs/view_forms/' + viewID + '.xms', screenFormData );
	RegisterScreenFormFromStr( ReplaceUrlPathSuffix( viewUrl, '.xml', '.xms' ), screenFormData );

	doc = OpenNewDoc( viewUrl );
	doc.Url = viewUrl;
	doc.SetCached();
	
	load_stored_filters( viewID, doc.TopElem.filter );
	adjust_filters( viewID, doc.TopElem );

	return viewUrl;
}



function obtain_view_dlg_url( viewID, extQuery )
{
	param = build_view_param( viewID );
	extQuery = extract_mod_ext_query( param, extQuery );

	formUrl = 'x-app://base1/base1_generic_dlg.xmd?id=' + viewID;
	//if ( extQuery != undefined )
		//formUrl += '&' + extQuery;

	if ( GetOptCachedForm( formUrl ) != undefined )
		return formUrl;

	//for ( p in extQuery )
		//alert( extQuery );

	param = build_view_param( viewID, extQuery );

	form = RegisterFormFromStr( formUrl, '<SPXML-FORM><generic_dlg></generic_dlg></SPXML-FORM>' );
	build_form( param, true, form );

	screenFormData = build_screen_form( param, true );
	PutUrlData( 'x-local://Logs/zz_dlg.xms', screenFormData );
	RegisterScreenFormFromStr( ReplaceUrlPathSuffix( formUrl, '.xmd', '.xms' ), screenFormData );

	return formUrl;
}



function build_view_filter_form_data( viewID )
{
	param = build_view_param( viewID );
	
	form = CreateFormFromStr( '<SPXML-FORM><view_filter_base SAMPLE="1"/></SPXML-FORM>' );

	build_form_filters( param, form.Child( 'view_filter_base' ) );

	return form.Xml;
}


function build_card_view_screen_data( viewID )
{
	param = build_view_param( viewID );

	screenFormData = build_screen_form( param, false );
	//alert( screenFormData );
	return screenFormData;
}


function build_card_view_list( viewID )
{
	param = build_view_param( viewID );
	param.listOnly = true;

	screenFormData = build_screen_form( param, false );
	//alert( screenFormData );
	return screenFormData;
}


function build_prepared_array_view_screen_data( viewID, preparedArrayFieldName )
{
	param = build_view_param( viewID );
	param.usePreparedArray = true;
	param.preparedArrayFieldName = preparedArrayFieldName;

	screenFormData = build_screen_form( param, false );
	PutUrlData( 'x-local://Logs/view_forms/prepared__' + viewID + '.xms', screenFormData );
	return screenFormData;
}


function build_prepared_array_view_list( viewID, preparedArrayFieldName )
{
	param = build_view_param( viewID );
	param.usePreparedArray = true;
	param.preparedArrayFieldName = preparedArrayFieldName;
	param.listOnly = true;

	screenFormData = build_screen_form( param, false );
	PutUrlData( 'x-local://Logs/view_forms/prepared__' + viewID + '.xms', screenFormData );
	return screenFormData;
}



function build_form( param, isDlg, form )
{
	if ( isDlg )
	{
		elem = form.TopElem.AddChild( 'object_id', 'integer' );
		elem.IsMultiple = true;

		elem = form.TopElem.AddChild( 'allow_multi_select', 'bool' );
		elem.NullFalse = true;
	}

	filter = form.TopElem.AddChild( 'filter', '' );
	build_form_filters( param, filter );


	if ( param.view.deferred_set_sel_action != '' )
	{
		preview = form.TopElem.AddChild( 'preview', '' );
		//preview.IsTemp = true;

		preview.Inherit( FetchForm( 'base1_general.xmd' ).EvalPath( 'view_data_preview' ) );

		elem = preview.AddChild( 'deferred_set_sel_action', 'string' );
		elem.DefaultValue = param.view.deferred_set_sel_action;
	}

	if ( isDlg )
	{
		elem = form.TopElem.AddChild( 't1', 'bool' );
		elem.ExprInit = 'lib_view.adjust_filters( ' + CodeLiteral( param.view.id ) + ', filter.Parent ); return true;';
	}
	else
	{
		elem = form.TopElem.AddChild( 'OnObjectSave', 'property' );
		elem.Expr = 'if ( ! lib_view.is_some_filter_applied( ' + CodeLiteral( param.view.id ) + ', filter.Parent ) ) { Screen.Update(); };';
	}
}


function build_form_filters( param, filter )
{
	filterElem = filter.AddChild( 'used_fulltext', 'string' );

	for ( dynFilter in param.view.dyn_filters )
	{
		if ( dynFilter.is_join_switcher )
		{
			filterElem = filter.AddChild( path_to_filter_elem_name( dynFilter.id ), 'bool' );
			filterElem.NullFalse = true;
		}
		else
		{
			elem = get_dyn_filter_target_elem( param, dynFilter );

			if ( dynFilter.data_type.HasValue )
				dataType = dynFilter.data_type;
			else if ( elem != undefined )
				dataType = elem.ResultDataType;
			else
				dataType = '';

			if ( dynFilter.use_range )
			{
				filterElem = filter.AddChild( 'min_' + path_to_filter_elem_name( dynFilter.id ), elem.Type );
				filterElem = filter.AddChild( 'max_' + path_to_filter_elem_name( dynFilter.id ), elem.Type );
			}
			else if ( dynFilter.use_range_min )
			{
				filterElem = filter.AddChild( 'min_' + path_to_filter_elem_name( dynFilter.id ), elem.Type );
			}
			else
			{
				filterElem = filter.AddChild( path_to_filter_elem_name( dynFilter.id ), dataType );
				
				if ( dynFilter.foreign_array_expr != '' )
					filterElem.ForeignArrayExpr = dynFilter.foreign_array_expr;
				else if ( elem != undefined )
					filterElem.ForeignArrayExpr = elem.ForeignArrayExpr;

				if ( dynFilter.is_multiple && filterElem.ForeignArrayExpr != '' )
					filterElem.IsMultiple = true;
				
				if ( dataType == 'bool' && dynFilter.use_checkbox )
					filterElem.NullFalse = true;

				if ( dynFilter.default_value != '' )
					filterElem.DefaultValue = dynFilter.default_value;

				if ( dynFilter.expr_init != '' )
					filterElem.ExprInit = dynFilter.expr_init;
			}
		}
	}
}


function build_screen_form( param, isDlg )
{
	rootItem = OpenDocFromStr( '<SPXML-SCREEN></SPXML-SCREEN>' ).TopElem;
	rootItem.AddAttr( 'SOURCE', 'TopElem' );

	build_screen_form_core( param, isDlg, rootItem );
	return rootItem.Xml;
}


function build_screen_form_core( param, isDlg, rootItem )
{
	if ( param.view.check_access_expr.HasValue )
	{
		try
		{
			eval( param.view.check_access_expr );
			errStr = '';
		}
		catch ( e )
		{
			errStr = e;
		}

		if ( errStr != '' )
		{
			panel = rootItem.AddChild( 'PANEL' );
			panel.AddAttr( 'SUNKEN', 1 );
			panel.AddAttr( 'HEIGHT', '100%' );

			item = panel.AddChild( 'PANEL' );
			item.AddAttr( 'HEIGHT', '44%' );

			label = panel.AddChild( 'LABEL' );
			label.AddAttr( 'TITLE', ExtractUserError( errStr ) );
			label.AddAttr( 'BOLD', '1' );
			label.AddAttr( 'ALIGN', 'center' );
			label.AddAttr( 'TEXT-COLOR', '128,0,0' );

			return;
		}
	}

	if ( param.view.before_init_action.HasValue )
		rootItem.AddAttr( 'BEFORE-INIT-ACTION', param.view.before_init_action );
	else if ( param.view.deferred_set_sel_action != '' )
		rootItem.AddAttr( 'BEFORE-INIT-ACTION', 'Ps.preview.timer_started = false;' );

	if ( param.listOnly )
	{
		panel = rootItem;
	}
	else
	{
		if ( isDlg )
		{
			rootItem.AddAttr( 'TITLE', UiText.titles.object_selection + ': ' + param.objectForm.Title );

			rootItem.AddAttr( 'WIDTH', ( 160 + calc_measure_hash( param ) ) + 'zr' );
			rootItem.AddAttr( 'HEIGHT', ( 92 + calc_measure_hash( param ) ) + 'zr' );

			okActionCode = 'list = Screen.FindItem( \'MainList\' );' + '\n';
			okActionCode += 'for ( row in list.SelRows ) { Ps.object_id.Add().Value = row.Env.ListElem.id; }' + '\n';
			okActionCode += 'if ( ! Ps.object_id.HasValue ) { Cancel(); }' + '\n';

			rootItem.AddAttr( 'OK-ACTION', okActionCode );

			panel = rootItem;
		}
		else
		{
			if ( rootItem.GetOptAttr( 'TITLE' ) == undefined )
				rootItem.AddAttr( 'TITLE', param.view.name );

			if ( param.view.width.HasValue )
			{
				rootItem.AddAttr( 'WIDTH', param.view.width );
				rootItem.AddAttr( 'HEIGHT', param.view.height );
				rootItem.AddAttr( 'RESIZE', 1 );
			}
			else
			{
				rootItem.AddAttr( 'MAXIMIZED', 1 );
			}

			if ( param.view.image_url.HasValue )
				rootItem.AddAttr( 'WINDOW-ICON-URL', param.view.image_url );
			else
				rootItem.AddAttr( 'WINDOW-ICON-URL', '//base_pict/list.ico' );

			if ( param.view.width.HasValue )
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
		}
		
		startIndex = 0;

		while ( true )
		{
			filtersNum = build_screen_dyn_filters_line( param, isDlg, panel, startIndex );
			if ( filtersNum == 0 )
				break;

			startIndex += filtersNum;
		}
		

		menu = panel.AddChild( 'MENU' );
		menu.AddAttr( 'RIGHT-CLICK', '1' );

		menuEntry = menu.AddChild( 'MENU-ENTRY' );
		menuEntry.AddAttr( 'TITLE', UiText.actions.clear_form );
		
		action = 'lib_view.clear_filters( ' + CodeLiteral( param.view.id ) + ', Ps ); lib_view.clear_stored_filters( ' + CodeLiteral( param.view.id ) + ' ); lib_view.adjust_filters( ' + CodeLiteral( param.view.id ) + ', Ps );';
		
		if ( param.view.use_manual_update )
			action += 'Screen.UpdateExcpt( Screen.FindItem( \'MainList\' ) )';
		else
			action += 'Screen.Update()';
		
		menuEntry.AddAttr( 'ACTION', action );
		menuEntry.AddAttr( 'PASSIVE', '1' );




		if ( isDlg )
		{
			panel = rootItem;

			item = panel.AddChild( 'ITEM' );
			item.AddAttr( 'TYPE', 'dlg_header_end' );
		}
		else
		{
			panel = rootItem.AddChild( 'PANEL' );
			panel.AddAttr( 'BK-COLOR-EXPR', '' );	// !!! for splittter
			//panel.AddAttr( 'SUNKEN', 1 );

			if ( param.view.list_with_preview_height.HasValue )
				listWithPreviewHeight = param.view.list_with_preview_height;
			else
				listWithPreviewHeight = '40%';

			if ( param.view.frame_sub_url.HasValue || param.view.frame_sub_view_id.HasValue || param.view.use_preview_expr != '' )
				panel.AddAttr( 'HEIGHT', listWithPreviewHeight );
			else if ( param.view.allow_preview )
				panel.AddAttr( 'HEIGHT-EXPR', 'lib_view.use_preview( \'' + param.view.id + '\' ) ? \'40%\' : \'100%\'' );
			else
				panel.AddAttr( 'HEIGHT', '100%' );
		}
	}

	list = panel.AddChild( 'LIST' );
	list.AddAttr( 'NAME', 'MainList' );
	
	list.AddAttr( 'USE-KEY-SEL', '1' );

	if ( param.view.set_sel_action.HasValue )
		list.AddAttr( 'MOVE-SEL-ON-DELETE', '1' );

	list.AddAttr( 'SUNKEN', 1 );

	if ( isDlg )
		list.AddAttr( 'HEIGHT-EXPR', 'lib_base.dlg_body_height' );

	if ( param.objectForm.IsHier && param.view.is_hier != false )
		list.AddAttr( 'HIER', '1' );

	if ( param.view.hier_collapsed )
		list.AddAttr( 'HIER-EXPANDED', '0' );

	if ( param.usePreparedArray )
	{
		list.AddAttr( 'LOOP-EXPR', 'lib_view.BuildPreparedLoopArray( Ps.' + param.preparedArrayFieldName + ', List )' );
	}
	else
	{
		list.AddAttr( 'LOOP-CATALOG', param.catalogName );
	
		if ( ! param.listOnly )
			list.AddAttr( 'FT-FILTER', 'Ps.filter' );

		if ( param.view.static_filters.ChildNum != 0 || param.view.dyn_filters.ChildNum != 0 )
			list.AddAttr( 'XQUERY-QUAL-EXPR', 'lib_view.build_xquery_qual( ' + CodeLiteral( param.view.id ) + ', Ps )' );
	}

	if ( base1_config.use_xquery_fields )
	{
		list.AddAttr( 'XQUERY-FIELDS-EXPR', '[' + ArrayMerge( param.xqueryFieldNames, 'CodeLiteral( This )', ',' ) + ']' );
	}

	if ( ! param.usePreparedArray )
		list.AddAttr( 'AFTER-BUILD-ASYNC-ACTION', 'if ( StrContains( Screen.FrameName, \'Sub\' ) ) return; size = ArrayOptSize( MainArray ); if ( size == undefined ) { StatusMsg( \'\' ); return; }; StatusMsg( UiText.titles.items_in_list + \': \' + StrInt( size, 0, true ) + ( lib_view.is_some_filter_applied( ' + CodeLiteral( param.view.id ) + ', Ps ) ? \'  (' + UiText.titles.with_filter + ')\' : \'\' ) )' );

	if ( ! lib_user.allow_list_copy )
		list.AddAttr( 'OnCheckCommand', 'switch ( Command ) { case \'Copy\': return false; };' );
	
	row = list.AddChild( 'ROW' );
	row.AddAttr( 'IMAGE-URL-EXPR', 'ListElem.ImageUrl' );

	if ( isDlg )
	{
		row.AddAttr( 'OPEN-ACTION', 'Screen.RunCommand( \'Ok\' )' );
	}
	else if ( System.IsWebClient && StrBegins( UrlPath( System.WebClientUrl ), '/web_entry/' ) )
	{
		row.AddAttr( 'OPEN-ACTION', 'lib_w4_ui.open_object_card( ListElem.ObjectUrl )' );
	}
	else
	{
		if ( param.view.open_action != '' )
			row.AddAttr( 'OPEN-ACTION', param.view.open_action );
		else if ( param.usePreparedArray )
			row.AddAttr( 'OPEN-ACTION', 'ObtainDocScreen( ListElem.PrimaryObjectUrl )' );

		if ( param.view.delete_action != '' )
			row.AddAttr( 'DELETE-ACTION', param.view.delete_action );
		else if ( param.usePreparedArray )
			row.AddAttr( 'DELETE-ACTION', 'DeleteDoc( ListElem.PrimaryObjectUrl )' );
	}
	
	if ( param.view.set_sel_action.HasValue )
	{
		row.AddAttr( 'SET-SEL-ACTION', param.view.set_sel_action );
	}
	else if ( param.view.frame_sub_view_id.HasValue )
	{
		setSelAction = '';
		i = 0;

		for ( frameSubViewID in param.view.frame_sub_view_id )
		{
			subViewParam = build_view_param( frameSubViewID );
			subDynFilter = subViewParam.view.dyn_filters[0];
			frameName = 'FrameSubView' + ( i == 0 ? '' : i );

			setSelAction += 'item = Screen.FindOptItem( \'' + frameName + '\' );';
			setSelAction += 'if ( item == undefined ) Cancel();';
			setSelAction += 'item.InnerScreen.Doc.TopElem.filter.' + path_to_filter_elem_name( subDynFilter.id ) + ' = ListElem.id;';
			setSelAction += 'item.InnerScreen.Update();'; //!!!

			i++;
		}

		setSelAction += 'Cancel();'
		row.AddAttr( 'SET-SEL-ACTION', setSelAction );
	}
	else if ( param.view.use_preview_expr != '' )
	{
		previewScreenFormUrl = ReplaceUrlPathSuffix( param.objectForm.Url, '.xmd', '_preview.xms' );

		setSelAction = 'item = Screen.FindOptItem( \'FrameObjectPreview\' );';
		setSelAction += 'if ( ! ' + param.view.use_preview_expr + ' ) Cancel();';
		setSelAction += 'doc = DefaultDb.OpenObjectDoc( \'' + param.objectName + '\', ListElem.id );';
		setSelAction += 'item.InnerScreen.EditMode = false;\n';
		setSelAction += 'item.InnerScreen.SetDoc( doc, \'' + previewScreenFormUrl + '\' );';

		if ( param.view.deferred_set_sel_action != '' )
			setSelAction += 'Ps.preview.handle_set_sel( ListElem );\r\n'

		setSelAction += 'Cancel();'
		row.AddAttr( 'SET-SEL-ACTION', setSelAction );
	}
	else if ( param.view.allow_preview )
	{
		previewScreenFormUrl = ReplaceUrlPathSuffix( param.objectForm.Url, '.xmd', '.xms' );

		setSelAction = 'if ( ! lib_view.use_preview( \'' + param.view.id + '\' ) ) Cancel();';
		setSelAction += 'item = Screen.FindOptItem( \'FrameObjectPreview\' );';
		setSelAction += 'doc = DefaultDb.OpenObjectDoc( \'' + param.objectName + '\', ListElem.id );';
		setSelAction += 'item.InnerScreen.EditMode = false;\n';
		setSelAction += 'item.InnerScreen.SetDoc( doc, \'' + previewScreenFormUrl + '\' );';

		setSelAction += 'Cancel();'
		row.AddAttr( 'SET-SEL-ACTION', setSelAction );
	}


	flexFieldsNum = 0;

	for ( field in param.view.fields )
	{
		if ( field.id == '' )
		{
			flexFieldsNum++;
			continue;
		}

		if ( ! param.recordForm.PathExists( field.id ) )
			throw 'No such field: ' + field.id;

		elem = param.recordForm.EvalPath( field.id );

		if ( lib_base.get_field_default_col_len( elem ) == null )
			flexFieldsNum++;

		if ( field.width.HasValue && StrEnds( field.width, '%' ) )
		{
			flexFieldsNum = 0;
			break;
		}
	}

	if ( flexFieldsNum != 0 )
	{
		defaultPercentWidth = 100 / flexFieldsNum;
		sumFlexFieldsNum = 0;
		sumPercentWidth = 0;
	}
	
	for ( field in param.view.fields )
	{
		if ( field.id != '' )
			elem = param.recordForm.EvalPath( field.id );
		else
			elem = undefined;

		if ( elem != undefined && elem.ForeignArrayExpr != '' )
			vocInfo = lib_voc.get_opt_voc_info( elem.ForeignArrayExpr );
		else
			vocInfo = undefined;

		if ( field.elem_expr != '' )
			elemExpr = 'with ( Ps ) { with ( ListElem ) { return ' + field.elem_expr + '; }}';
		else
			elemExpr = 'ListElem.' + field.id;

			
		col = row.AddChild( 'COL' );

		colTitle = get_field_col_title( param, field );
		col.AddAttr( 'COL-TITLE', colTitle );

		if ( field.col_tip_text.HasValue )
			col.AddAttr( 'TIP-TEXT', field.col_tip_text );

		if ( field.width.HasValue )
		{
			widthMeasure = field.width;
		}
		else
		{
			if ( elem != undefined && ( colLen = lib_base.get_field_default_col_len( elem ) ) != null )
			{
				if ( field.use_time )
					colLen += 6;

				if ( field.time_only )
					colLen = 6;

				if ( field.ChildIndex == 0 )
					colLen += 2;

				minTitleLen = StrCharCount( colTitle );
				if ( field.ChildIndex == 0 || field.is_default_sort )
					minTitleLen += 4;

				if ( colLen + 1 < minTitleLen )
					colLen = minTitleLen + 1;

				widthMeasure = ( colLen + 2 ) + 'zr';
			}
			else if ( flexFieldsNum != 0 )
			{
				if ( sumFlexFieldsNum != flexFieldsNum - 1 )
				{
					widthMeasure = defaultPercentWidth + '%';
					sumPercentWidth += defaultPercentWidth;
				}
				else
				{
					widthMeasure = ( 100 - sumPercentWidth ) + '%';
				}

				sumFlexFieldsNum++;
			}
			else
			{
				widthMeasure = '6zr';
			}
		}

		col.AddAttr( 'WIDTH', widthMeasure );

		orderExpr = '';

		if ( field.title_expr != '' )
		{
			titleExpr = 'with ( Ps ) { with ( ListElem ) { return ' + field.title_expr + '; }}';
		}
		else if ( elem != undefined )
		{
			//if ( StrContains( field.id, 'source_agencies' ) )
				//DebugMsg( elem.ForeignArrayExpr );
			
			titleExpr = elemExpr;

			if ( elem != undefined && elem.ForeignArrayExpr != '' )
			{
				if ( titleExpr == 'ListElem.' + field.id && ( newPathExpr = process_multi_path_title_expr( param.recordForm, field.id ) ) != undefined )
					titleExpr = 'ArrayMerge( ListElem.' + newPathExpr + ', \'ForeignDispName\', \', \' )';
				else
					titleExpr = add_attr_code_chain( titleExpr, '.ForeignDispName' );
			}
			
			orderExpr = StrReplace( titleExpr, 'ListElem.', '' );

			if ( elem != undefined && elem.ResultDataType == 'integer' && elem.ForeignArrayExpr == '' )
				titleExpr = ( field.show_zeroes ? 'StrInt( ' : 'StrIntZero( ' ) + titleExpr + ' )';
			else if ( elem != undefined && elem.ResultDataType == 'bool' )
				titleExpr = titleExpr + ' ? \'+\' : \'\'';
			else if ( field.use_time == false )
				titleExpr = 'StrDate( ' + titleExpr + ', false )';
			else if ( field.use_time == true )
				titleExpr = 'StrDate( ' + titleExpr + ', true, false )';
			else if ( field.time_only )
				titleExpr = 'StrTime( ' + titleExpr + ', false )';
		}
		else
		{
			throw 'title_expr or id required';
		}

		col.AddAttr( 'TITLE-EXPR', titleExpr );

		//if (  elem != undefined && elem.ForeignArrayExpr != '' )
			//col.AddAttr( 'ERROR-TEXT', '' );

		if ( field.order.HasValue )
		{
			if ( StrContains( field.order, '?' ) && field.use_local_sort )
				col.AddAttr( 'ORDER', 'with ( Ps ) { return ' + field.order + '; }' );
			else
				col.AddAttr( 'ORDER', field.order );
			
			if ( field.order_dir.HasValue )
				col.AddAttr( 'ORDER-DIR', field.order_dir );

			for ( i = 1; i <= 1; i++ )
			{
				if ( ( order = field.Child( 'order' + i ) ) != '' )
				{
					col.AddAttr( 'ORDER' + i, order );

					if ( ( orderDir = field.Child( 'order_dir' + i ) ) != '' )
						col.AddAttr( 'ORDER-DIR' + i, orderDir );
				}
			}
		}
		else if ( field.use_time.HasValue )
		{
			col.AddAttr( 'ORDER', orderExpr );
			col.AddAttr( 'ORDER-DIR', '-' );
		}
		else if ( field.ChildIndex == 0 && ( voc = lib_voc.get_opt_voc_info( param.catalogName ) ) != undefined )
		{
			col.AddAttr( 'ORDER', 'order_index' );
		}
		else if ( orderExpr != '' )
		{
			col.AddAttr( 'ORDER', orderExpr );
		}

		if ( field.use_local_sort )
			col.AddAttr( 'LOCAL-SORT', '1' );

		align = get_field_align( param, field );
		if ( align != '' )
			col.AddAttr( 'ALIGN', align );

		if ( field.text_color_expr.HasValue )
			col.AddAttr( 'TEXT-COLOR-EXPR', build_item_attr_code( field.text_color_expr, 'ListElem' ) );
		else if ( field.text_color.HasValue )
			col.AddAttr( 'TEXT-COLOR', field.text_color );
		else if ( vocInfo != undefined && vocInfo.use_text_color && ! ( elem != undefined && elem.IsMultiple ) )
			col.AddAttr( 'TEXT-COLOR-EXPR', add_attr_code_chain( elemExpr, '.ForeignElem.text_color' ) );

		if ( field.bk_color_expr.HasValue )
			col.AddAttr( 'BK-COLOR-EXPR', build_item_attr_code( field.bk_color_expr, 'ListElem' ) );
		else if ( vocInfo != undefined && vocInfo.use_bk_color && ! ( elem != undefined && elem.IsMultiple ) )
			col.AddAttr( 'BK-COLOR-EXPR', add_attr_code_chain( elemExpr, '.ForeignElem.bk_color' ) );

		if ( field.is_default_sort )
			col.AddAttr( 'DEFAULT-SORT', '1' );

	}


	menu = list.AddChild( 'MENU' );
	menu.AddAttr( 'RIGHT-CLICK', '1' );

	if ( ! param.view.drop_all_context_actions )
	{
		menuEntry = menu.AddChild( 'MENU-ENTRY' );
		menuEntry.AddAttr( 'TITLE', UiText.actions.open );
		menuEntry.AddAttr( 'CMD', 'OpenSel' );

		menuEntry = menu.AddChild( 'MENU-ENTRY' );
		menuEntry.AddAttr( 'SEPARATOR', '1' );

		menuEntry = menu.AddChild( 'MENU-ENTRY' );
		menuEntry.AddAttr( 'TITLE', UiText.actions.del );
		menuEntry.AddAttr( 'CMD', 'Clear' );

		menuEntry = menu.AddChild( 'MENU-ENTRY' );
		menuEntry.AddAttr( 'SEPARATOR', '1' );

		menuEntry = menu.AddChild( 'MENU-ENTRY' );
		menuEntry.AddAttr( 'TITLE-EXPR', 'UiText.titles.export_to + \' \' + lib_office.active_calc_name' );
		menuEntry.AddAttr( 'ACTION', 'lib_view.ShowScreenInExcel( Screen, List )' );
		menuEntry.AddAttr( 'PASSIVE', '1' );
		menuEntry.AddAttr( 'ENABLE-EXPR', 'lib_user.allow_list_copy' );

		if ( param.view.allow_preview )
		{
			menuEntry = menu.AddChild( 'MENU-ENTRY' );
			menuEntry.AddAttr( 'SEPARATOR', '1' );

			menuEntry = menu.AddChild( 'MENU-ENTRY' );
			menuEntry.AddAttr( 'TITLE', UiText.actions.Child( 'preview_mode' ) );
			menuEntry.AddAttr( 'ACTION', 'lib_view.set_use_preview( \'' + param.view.id + '\', ! lib_view.use_preview( \'' + param.view.id + '\' ) )' );
		}

		if ( param.view.use_preview_expr.HasValue && param.view.open_action == 'return;' ) // !!!
		{
			menuEntry = menu.AddChild( 'MENU-ENTRY' );
			menuEntry.AddAttr( 'SEPARATOR', '1' );

			menuEntry = menu.AddChild( 'MENU-ENTRY' );
			menuEntry.AddAttr( 'TITLE', UiText.actions.view_as_xml );
			menuEntry.AddAttr( 'ACTION', 'lib_base.show_doc_source( OpenDoc( List.SelRow.Env.ListElem.ObjectUrl ) );' );
		}
	}

	if ( param.view.context_menu_sample.name != '' )
	{
		inheritEntry = menu.AddChild( 'INHERIT' );
		inheritEntry.AddAttr( 'FORM', param.view.context_menu_sample.form_url );
		inheritEntry.AddAttr( 'TYPE', param.view.context_menu_sample.name );
	}

	count = 0;

	for ( action in lib_voc.get_sorted_voc( object_actions ) )
	{
		if ( ! action.show_in_context_menu )
			continue;

		if ( action.object_type_id.HasValue && action.object_type_id != param.objectName )
			continue;

		if ( count == 0 )
		{
			menuEntry = menu.AddChild( 'MENU-ENTRY' );
			menuEntry.AddAttr( 'SEPARATOR', '1' );
		}

		menuEntry = menu.AddChild( 'MENU-ENTRY' );
		menuEntry.AddAttr( 'TITLE', action.name );
		menuEntry.AddAttr( 'ACTION', 'lib_base.run_list_object_action( List, \'' + action.id + '\', \'' + action.id + '\' )' );

		if ( action.is_passive )
			menuEntry.AddAttr( 'PASSIVE', '1' );

		if ( action.enable_expr.HasValue )
			menuEntry.AddAttr( 'ENABLE-EXPR', action.enable_expr );

		count++;
	}


	if ( isDlg )
	{
		item = panel.AddChild( 'ITEM' );
		item.AddAttr( 'TYPE', 'dlg_footer_start' );

		table = panel.AddChild( 'TABLE' );
		columns = table.AddChild( 'COLUMNS' );

		if ( param.view.allow_add_new_in_select_dlg )
		{
			col = columns.AddChild( 'COL' );
			col.AddAttr( 'WIDTH', '24zr' );
		}

		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', '100%' );

		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', '14zr' );

		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', '14zr' );

		if ( param.view.allow_add_new_in_select_dlg )
		{
			item = table.AddChild( 'BUTTON' );
			item.AddAttr( 'TITLE', UiText.actions.new_elem_of_voc + '...' );
			item.AddAttr( 'ACTION', 'lib_view.handle_add_new_elem_in_select_dlg( ' + CodeLiteral( param.view.id ) + ', Screen )' );
		}

		item = table.AddChild( 'LABEL' );

		item = table.AddChild( 'BUTTON' );
		item.AddAttr( 'TITLE', 'OK' );
		item.AddAttr( 'CMD', 'Ok' );

		item = table.AddChild( 'BUTTON' );
		item.AddAttr( 'TITLE', UiText.actions.cancel );
		item.AddAttr( 'CMD', 'Cancel' );
	}


	if ( ! isDlg )
	{
		if ( param.view.frame_sub_view_id.HasValue )
		{
			i = 0;

			for ( frameSubViewID in param.view.frame_sub_view_id )
			{
				split = rootItem.AddChild( 'SPLIT' );
				//split.AddAttr( 'HORIZ', '1' );

				frame = rootItem.AddChild( 'FRAME' );
				frame.AddAttr( 'NAME', 'FrameSubView' + ( i == 0 ? '' : i ) );
				frame.AddAttr( 'HREF-EXPR', 'lib_view.obtain_view_url( ' + CodeLiteral( frameSubViewID ) +  ' )' );

				if ( i + 1 != ArrayCount( param.view.frame_sub_view_id ) )
					frame.AddAttr( 'HEIGHT', '50%' );

				i++;
			}
		}
		else if ( param.view.frame_sub_url != '' )
		{
			split = rootItem.AddChild( 'SPLIT' );

			frame = rootItem.AddChild( 'FRAME' );
			frame.AddAttr( 'NAME', 'FrameSubView' );
			frame.AddAttr( 'HREF', param.view.frame_sub_url );
		}
		else if ( param.view.use_preview_expr != '' )
		{
			split = rootItem.AddChild( 'SPLIT' );

			frame = rootItem.AddChild( 'FRAME' );
			frame.AddAttr( 'NAME', 'FrameObjectPreview' );
			frame.AddAttr( 'HREF', 'x-app://base1/base1_blank.xms' );
		}
		else if ( param.view.allow_preview )
		{
			split = rootItem.AddChild( 'SPLIT' );

			frame = rootItem.AddChild( 'FRAME' );
			frame.AddAttr( 'NAME', 'FrameObjectPreview' );
			frame.AddAttr( 'HREF', 'x-app://base1/base1_blank.xms' );
		}

		if ( ! param.listOnly )
		{
			item = rootItem.AddChild( 'INHERIT' );
			item.AddAttr( 'TYPE', 'view_commands' );

			if ( ! isDlg )
			{
				item = rootItem.AddChild( 'INHERIT' );
				item.AddAttr( 'TYPE', 'view_commands_2' );
			}
		}
	}

}


function process_multi_path_title_expr( recordFormElem, path )
{
	namesArray = String( path ).split( '.' );
	if ( namesArray.length <= 1 )
		return undefined;

	curFormElem = recordFormElem;

	for ( i = 0; i < namesArray.length; i++ )
	{
		formElem = curFormElem.Child( namesArray[i] );

		if ( formElem.IsMultiple && i != 0 && i + 1 < namesArray.length )
		{
			newPath = ArrayMerge( ArrayRange( namesArray, 0, i ), 'This', '.' ) + '.EvalMultiPath( ' + CodeLiteral( ArrayMerge( ArrayRange( namesArray, i, namesArray.length - i ), 'This', '.' ) ) + ' )';
			//DebugMsg( newPath );
			return newPath;
		}

		curFormElem = formElem;
	}

	return undefined;
}


function get_multi_path_title( recordFormElem, path )
{
	namesArray = String( path ).split( '.' );
	if ( namesArray.length <= 1 )
		return '';

	curFormElem = recordFormElem;

	for ( i = 0; i < namesArray.length; i++ )
	{
		formElem = curFormElem.Child( namesArray[i] );

		if ( formElem.IsMultiple && i != 0 && i + 1 < namesArray.length )
		{
			return curFormElem.Title;
		}

		curFormElem = formElem;
	}

	return '';
}


function get_multi_path_col_title( recordFormElem, path )
{
	namesArray = String( path ).split( '.' );
	if ( namesArray.length <= 1 )
		return '';

	curFormElem = recordFormElem;

	for ( i = 0; i < namesArray.length; i++ )
	{
		formElem = curFormElem.Child( namesArray[i] );

		if ( formElem.IsMultiple && i != 0 && i + 1 < namesArray.length )
		{
			if ( curFormElem.ColTitle != '' )
				return curFormElem.ColTitle;
			else
				return curFormElem.Title;
		}

		curFormElem = formElem;
	}

	return '';
}


function build_screen_dyn_filters_line( param, isDlg, panel, startIndex )
{
	useFt = ( startIndex == 0 && ! param.view.drop_ft );
	useAction = ( startIndex == 0 && param.view.action.title != '' && ! isDlg );
	
	if ( useAction && param.view.action.exist_req_expr.HasValue )
	{
		if ( ! eval( param.view.action.exist_req_expr ) )
			useAction = false;
	}
	
	if ( startIndex != 0 )
	{
		delim = panel.AddChild( 'PANEL' );
		delim.AddAttr( 'HEIGHT', '2px' );
	}

	table = panel.AddChild( 'TABLE' );
	columns = table.AddChild( 'COLUMNS' );

	if ( useFt )
	{
		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', '38zr' );

		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', ( useAction ? '70%' : '100%' ) );
	}

	boundLen = 150;
	if ( useFt )
		boundLen -= 38;

	realFiltersNum = 0;
	sumLen = 0;

	for ( index = startIndex; index < param.view.dyn_filters.ChildNum; index++ )
	{
		dynFilter = param.view.dyn_filters[index];
		if ( dynFilter.is_auto )
			continue;

		if ( dynFilter.use_new_line && realFiltersNum != 0 )
			break;

		elem = get_dyn_filter_target_elem( param, dynFilter );

		if ( dynFilter.data_type.HasValue )
			dataType = dynFilter.data_type;
		else if ( elem != undefined )
			dataType = elem.ResultDataType;
		else
			dataType = '';

		if ( dynFilter.title != '' )
			title = dynFilter.title;
		else if ( elem.Title != '' )
			title = elem.Title;
		else if ( elem != undefined )
			title = get_multi_path_title( param.recordForm, dynFilter.id );

		if ( dynFilter.width.HasValue )
		{
			widthMeasure = dynFilter.width;
			len = measure_to_zr_num( widthMeasure, boundLen );
		}
		else
		{
			if ( dynFilter.is_join_switcher )
				len = 30;
			else if ( elem != undefined && elem.ExpMaxLen != null )
				len = Max( elem.ExpMaxLen + 8, StrCharCount( title ) + 1 );
			else if ( elem != undefined && elem.ForeignArrayExpr == '' && elem.ResultDataType == 'integer' )
				len = 7;
			else if ( elem != undefined && elem.ForeignArrayExpr == '' && elem.ResultDataType == 'date' )
				len = 14;
			else if ( dataType == 'bool' && dynFilter.use_checkbox )
				len = StrCharCount( title ) + 5;
			else if ( dataType == 'bool' && ! dynFilter.use_checkbox )
				len = StrCharCount( title ) + 3;
			else
				len = Max( StrCharCount( title ) + 1, 30 );

			if ( dynFilter.use_range )
				len *= 2;

			if ( dynFilter.use_period_quick_selector )
				len += 4;

			widthMeasure = len + 'zr';
		}

		sumLen += len;
		if ( sumLen >= boundLen && realFiltersNum != 0 && ArrayOptFind( param.view.dyn_filters, 'use_new_line' ) == undefined )
		{
			//DebugMsg( sumLen + ' ' + boundLen );
			//DebugMsg( dynFilter.Xml );

			//index--;
			break;
		}

		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', widthMeasure );
		realFiltersNum++;
	}

	//alert( index );

	filtersNum = index - startIndex;

	if ( useAction )
	{
		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', '30%' );

		col = columns.AddChild( 'COL' );
		col.AddAttr( 'WIDTH', ( StrCharCount( param.view.action.title ) + 8 ) + 'zr' );
	}

	if ( useFt )
	{
		item = table.AddChild( 'ITEM' );
		item.AddAttr( 'TYPE', 'ft_filter' );
		item.AddAttr( 'SOURCE', 'Ps.filter' );

		item = table.AddChild( 'PANEL' );
	}

	for ( index = startIndex; index < startIndex + filtersNum; index++ )
	{
		dynFilter = param.view.dyn_filters[index];
		if ( dynFilter.is_auto )
			continue;

		elem = get_dyn_filter_target_elem( param, dynFilter );

		if ( dynFilter.data_type.HasValue )
			dataType = dynFilter.data_type;
		else if ( elem != undefined )
			dataType = elem.ResultDataType;
		else
			dataType = '';

		if ( dynFilter.title != '' )
			title = dynFilter.title;
		else if ( elem.Title != '' )
			title = elem.Title;
		else if ( elem != undefined )
			title = get_multi_path_title( param.recordForm, dynFilter.id );

		panel = table.AddChild( 'PANEL' );

		if ( ! dynFilter.is_join_switcher && ( dataType != 'bool' || ! dynFilter.use_checkbox ) )
		{
			item = panel.AddChild( 'LABEL' );
			item.AddAttr( 'TITLE', title + ':' );
		}

		if ( dynFilter.is_join_switcher )
		{
			item = panel.AddChild( 'PANEL' );
			item.AddAttr( 'HEIGHT', '3zr' );

			item = panel.AddChild( 'CHECK' );
			item.AddAttr( 'TITLE', title );
			item.AddAttr( 'SOURCE', 'Ps.filter.' + path_to_filter_elem_name( dynFilter.id ) );

			build_filter_item_common_attr( param, dynFilter, item );
		}
		else if ( dynFilter.use_range )
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

			if ( elem.ResultDataType == 'date' )
			{
				item = subTable.AddChild( 'ITEM' );
				item.AddAttr( 'TYPE', 'date_selector' );
			}
			else
			{
				item = subTable.AddChild( 'EDIT' );

				if ( param.view.use_manual_update )
					item.AddAttr( 'ACTION', 'Screen.Update()' );
			}
			
			item.AddAttr( 'SOURCE', 'Ps.filter.min_' + path_to_filter_elem_name( dynFilter.id ) );

			build_filter_item_common_attr( param, dynFilter, item );

			if ( dynFilter.join_catalog_name != '' && ( switcherFilter = ArrayOptFind( param.view.dyn_filters, 'is_join_switcher' ) ) != undefined )
				item.AddAttr( 'ENABLE-EXPR', 'Ps.filter.' + path_to_filter_elem_name( switcherFilter.id ) );

			if ( elem.ResultDataType == 'date' )
			{
				item = subTable.AddChild( 'ITEM' );
				item.AddAttr( 'TYPE', 'date_selector' );
			}
			else
			{
				item = subTable.AddChild( 'EDIT' );

				if ( param.view.use_manual_update )
					item.AddAttr( 'ACTION', 'Screen.Update()' );
			}

			item.AddAttr( 'SOURCE', 'Ps.filter.max_' + path_to_filter_elem_name( dynFilter.id ) );

			build_filter_item_common_attr( param, dynFilter, item );

			if ( dynFilter.join_catalog_name != '' && ( switcherFilter = ArrayOptFind( param.view.dyn_filters, 'is_join_switcher' ) ) != undefined )
				item.AddAttr( 'ENABLE-EXPR', 'Ps.filter.' + path_to_filter_elem_name( switcherFilter.id ) );

			if ( dynFilter.use_period_quick_selector )
			{
				item = subTable.AddChild( 'ITEM' );
				item.AddAttr( 'TYPE', 'period_quick_selector' );
				item.AddAttr( 'SOURCE', 'Ps.filter.min_' + path_to_filter_elem_name( dynFilter.id ) );
			}
		}
		else if ( dynFilter.use_range_min )
		{
			if ( elem.ResultDataType == 'date' )
			{
				item = panel.AddChild( 'ITEM' );
				item.AddAttr( 'TYPE', 'date_selector' );
			}
			else
			{
				item = panel.AddChild( 'EDIT' );
			}
			
			item.AddAttr( 'SOURCE', 'Ps.filter.min_' + path_to_filter_elem_name( dynFilter.id ) );

			build_filter_item_common_attr( param, dynFilter, item );
		}
		else
		{
			if ( elem != undefined && elem.ForeignArrayExpr != '' )
			{
				item = panel.AddChild( 'ITEM' );

				if ( lib_voc.get_opt_voc_info( elem.ForeignArrayExpr ) != undefined )
				{
					item.AddAttr( 'TYPE', 'voc_elem_selector' );

					if ( dynFilter.view_filter_expr.HasValue )
						item.AddAttr( 'view-filter-expr', 'with ( Ps ) { return ' + dynFilter.view_filter_expr + '; }' );

					if ( lib_base.has_catalog_filter_constraints( param.catalogName, dynFilter.id ) )
						item.AddAttr( 'CHECK-VALUE-ACTION', 'lib_base.check_catalog_filter_constraints( \'' + param.catalogName + '\', \'' + dynFilter.id + '\', NewValue )' );
				}
				else if ( DefaultDb.GetOptCatalog( elem.ForeignArrayExpr ) != undefined )
				{
					item.AddAttr( 'TYPE', 'object_selector' );

					if ( dynFilter.view_filter_expr.HasValue )
						item.AddAttr( 'view-filter-expr', 'with ( Ps ) { return ' + dynFilter.view_filter_expr + '; }' );

					if ( lib_base.has_catalog_filter_constraints( param.catalogName, dynFilter.id ) )
						item.AddAttr( 'CHECK-VALUE-ACTION', 'lib_base.check_catalog_filter_constraints( \'' + param.catalogName + '\', \'' + dynFilter.id + '\', NewValue )' );
				}
				else
					item.AddAttr( 'TYPE', 'elem_selector' );

				item.AddAttr( 'usage', 'filter' );
			}
			else if ( dataType == 'bool' )
			{
				if ( dynFilter.use_checkbox )
				{
					item = panel.AddChild( 'PANEL' );
					item.AddAttr( 'HEIGHT', '3zrc' );

					item = panel.AddChild( 'CHECK' );
					item.AddAttr( 'TITLE', title );
				}
				else
				{
					item = panel.AddChild( 'ITEM' );
					item.AddAttr( 'TYPE', 'tri_state_selector' );
					item.AddAttr( 'usage', 'filter' );
				}
			}
			else
			{
				item = panel.AddChild( 'EDIT' );

				if ( param.view.use_manual_update )
					item.AddAttr( 'ACTION', 'Screen.Update()' );
			}
			
			item.AddAttr( 'SOURCE', 'Ps.filter.' + path_to_filter_elem_name( dynFilter.id ) );

			build_filter_item_common_attr( param, dynFilter, item );

			if ( dynFilter.join_catalog_name != '' && ( switcherFilter = ArrayOptFind( param.view.dyn_filters, 'is_join_switcher' ) ) != undefined )
				item.AddAttr( 'ENABLE-EXPR', 'Ps.filter.' + path_to_filter_elem_name( switcherFilter.id ) );
		}
	}

	if ( useAction )
	{
		panel = table.AddChild( 'PANEL' );

		panel = table.AddChild( 'PANEL' );

		item = panel.AddChild( 'LABEL' );
		item.AddAttr( 'TITLE', ' ' );

		button = panel.AddChild( 'BUTTON' );
		button.AddAttr( 'TITLE', param.view.action.title );
		button.AddAttr( 'IMAGE-URL', param.view.action.image_url );
		button.AddAttr( 'STD-MARGINS', '0' );
		button.AddAttr( 'ACTION', param.view.action.code );
		button.AddAttr( 'PASSIVE', '1' );
	}

	return filtersNum;
}


function build_filter_item_common_attr( param, dynFilter, item )
{
	updateAction = '';

	if ( param.view.use_manual_update )
	{
		item.AddAttr( 'PASSIVE', '1' );
		updateAction += 'Screen.UpdateExcpt( Screen.FindItem( \'MainList\' ) );';
	}

	if ( dynFilter.use_store )
		updateAction += 'lib_view.store_filter_elem( ' + CodeLiteral( param.view.id ) + ', Source );';

	if ( updateAction != '' )
		item.AddAttr( 'UPDATE-ACTION', updateAction );
}


function get_field_col_title( param, field )
{
	if ( field.id != '' )
		elem = param.recordForm.EvalPath( field.id );
	else
		elem = undefined;

	if ( field.col_title != '' )
	{
		colTitle = field.col_title;
	}
	else if ( elem != undefined )
	{
		if ( elem.ColTitle != '' )
			colTitle = elem.ColTitle;
		else if ( elem.Title != '' )
			colTitle = elem.Title;
		else
			colTitle = get_multi_path_col_title( param.recordForm, field.id );
	}
	else
	{
		throw 'id or col_title required';
	}

	return colTitle;
}


function get_field_align( param, field )
{
	if ( field.ChildIndex == 0 )
		return '';

	if ( field.id != '' )
		elem = param.recordForm.EvalPath( field.id );
	else
		elem = undefined;

	if ( elem != undefined && elem.ForeignArrayExpr != '' )
		vocInfo = lib_voc.get_opt_voc_info( elem.ForeignArrayExpr );
	else
		vocInfo = undefined;

	if ( field.align != '' )
	{
		align = field.align;
	}
	else if ( elem != undefined )
	{
		if ( elem.ColAlign != '' )
			align = elem.ColAlign;
		else if ( vocInfo != undefined )
			align = 'center';
		else if ( elem.ForeignArrayExpr != '' )
			align = 'left';
		else if ( elem.ResultDataType == 'integer' || elem.ResultDataType == 'real' )
			align = 'right'
		else if ( elem.ResultDataType == 'bool' )
			align = 'center';
		else if ( elem.ResultDataType == 'date' )
			align = 'center';
		else
			align = '';
	}
	else
	{
		align = '';
	}

	return align;
}



function build_view_param( viewID, extQuery )
{
	view = subst_views.views.GetOptChildByKey( viewID );
	if ( view == undefined )
		view = GetOptForeignElem( views, viewID );
	if ( view == undefined )
		throw UserError( 'View not registered: ' + viewID );

	//alert( viewID + ' ' + view.fields.ChildNum );
	
	param = new Object;

	if ( view.parent_id.HasValue )
	{
		param.view = combine_views( view, view.parent_id.ForeignElem );
	}
	else
	{
		param.view = OpenNewDoc( '//base1/base1_view.xmd' ).TopElem;
		param.view.AssignElem( view );
	}

	//alert( param.view.id );

	param.catalogName = ( param.view.catalog_name != '' ? param.view.catalog_name : param.view.id );

	param.objectName = lib_base.catalog_name_to_object_name( param.catalogName );
	param.objectForm = DefaultDb.GetObjectForm( param.objectName );
	param.recordForm = get_catalog_record_form_elem( param.catalogName );

	param.listOnly = false;
	param.usePreparedArray = false;

	if ( extQuery != undefined )
	{
		extQueryObject = UrlQuery( 'http://tempuri/a?' + extQuery );

		for ( extQueryPropName in extQueryObject )
		{
			if ( extQueryPropName == 'id' || extQueryPropName == 'new_window' )
				continue;

			obj = decode_query_prop_name( extQueryPropName );

			staticFilter = param.view.static_filters.AddChild();
			staticFilter.id = obj.filterID;
			staticFilter.cmp_pred = obj.cmpPred;
			staticFilter.value = extQueryObject.GetProperty( extQueryPropName );

			dynFilter = param.view.dyn_filters.GetOptChildByKey( extQueryPropName );
			if ( dynFilter != undefined )
				dynFilter.Delete();
		}
	}

	for ( dynFilter in ArraySelectAll( param.view.dyn_filters ) )
	{
		if ( dynFilter.exist_req_expr.HasValue && ! eval( dynFilter.exist_req_expr ) )
			dynFilter.Delete();
	}

	for ( field in ArraySelectAll( param.view.fields ) )
	{
		if ( field.exist_req_expr.HasValue && ! eval( field.exist_req_expr ) )
			field.Delete();
	}

	if ( base1_config.use_xquery_fields )
	{
		param.xqueryFieldNames = new Array;
	
		for ( formElem in param.recordForm )
		{
			switch ( formElem.Name )
			{
				case 'id':
				case 'parent_id':
				case 'is_active':
				case 'is_tentative':
				case 'image_url':
				case 'order_index':
				case 'is_derived':
				case 'is_calendar_entry':
				case 'is_rr_poll':
				case 'is_testing':
				case 'is_own_person':
				case 'is_candidate':
				case 'is_own_org':
				//case 'raw_storage_id':
				//case 'is_read':
				case 'last_event_occurrence_id':
				case 'completion_id':
					param.xqueryFieldNames.push( formElem.Name );
					break;
			}
		}

		for ( field in param.view.fields )
		{
			if ( field.id == '' )
				continue;

			fieldID = field.id;
			if ( ( pos = String( fieldID ).indexOf( '.' ) ) >= 0 )
				fieldID = String( fieldID ).slice( 0, pos );

			if ( param.xqueryFieldNames.indexOf( fieldID ) < 0 )
				param.xqueryFieldNames.push( fieldID );
		}

		for ( fieldID in param.view.extra_field_ids )
		{
			if ( param.xqueryFieldNames.indexOf( fieldID ) < 0 )
				param.xqueryFieldNames.push( fieldID );
		}
	}

	return param;
}


function extract_mod_ext_query( param, extQuery )
{
	if ( extQuery == undefined )
		return undefined;

	newQuery = '';
	extQueryObject = UrlQuery( 'http://tempuri/a?' + extQuery );

	for ( extQueryPropName in extQueryObject )
	{
		if ( extQueryPropName == 'id' )
			continue;

		obj = decode_query_prop_name( extQueryPropName );

		dynFilter = param.view.dyn_filters.GetOptChildByKey( obj.filterID );
		if ( dynFilter != undefined )
			continue;

		if ( newQuery != '' )
			newQuery += '&';

		newQuery += extQueryPropName + '=' + extQueryObject.GetProperty( extQueryPropName );
	}

	if ( newQuery == '' )
		return undefined;

	//alert( newQuery );
	return newQuery;
}


function decode_query_prop_name( queryPropName )
{
	obj = new Object;
	//obj.SetStrictMode( false );

	if ( StrBegins( queryPropName, 'min_' ) )
	{
		obj.filterID = StrRightRangePos( queryPropName, 4 );
		obj.cmpPred = 'greater_or_equal';
	}
	else
	{
		obj.filterID = queryPropName;
		obj.cmpPred = 'equal';
	}

	return obj;
}


function get_catalog_record_form_elem( catalogName )
{
	return eval( catalogName ).Form.TopElem.Child( 0 );
}


function get_dyn_filter_target_elem( param, dynFilter )
{
	//if ( dynFilter.xquery_qual_expr.HasValue && ! param.recordForm.EvalPath( dynFilter.id ) )
		//return undefined;

	if ( dynFilter.use_ft )
		return param.objectForm.TopElem.EvalPath( dynFilter.id );
	else if ( dynFilter.is_join_switcher )
		return param.recordForm.EvalPath( 'id' );
	else if ( dynFilter.join_catalog_name )
		return get_catalog_record_form_elem( dynFilter.join_catalog_name ).EvalPath( dynFilter.id );
	else
		return param.recordForm.EvalPath( dynFilter.id );
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


function combine_views( view, baseView )
{
	combView = OpenNewDoc( 'base1_std_view.xmd' ).TopElem;
	combView.AssignElem( view );
	combView.AssignExtraElem( baseView );

	if ( ! combView.catalog_name.HasValue )
		combView.catalog_name = baseView.id;

	combView.static_filters.AssignElem( baseView.static_filters );

	for ( elem in view.static_filters )
		combView.static_filters.AddChild().AssignElem( elem );

	if ( view.drop_all_dyn_filters )
		combView.dyn_filters.Clear();
	else
		combView.dyn_filters.AssignElem( baseView.dyn_filters );

	for ( elem in view.dyn_filters )
		combView.dyn_filters.AddChild().AssignElem( elem );

	if ( view.fields.ChildNum != 0 )
		combView.fields.AssignElem( view.fields );

	if ( view.action.title.HasValue )
		combView.action.AssignElem( view.action );

	combView.hier_collapsed = view.hier_collapsed;

	combView.frame_sub_view_id.Clear();

	for ( instance in view.frame_sub_view_id.Instances )
		combView.frame_sub_view_id.ObtainByValue( instance );

	return combView;
}


function build_item_attr_code( origCodeStr, baseObjCodeStr )
{
	isBlock = StrContains( origCodeStr, 'return ' );

	codeStr = 'with ( Ps ) { with ( ' + baseObjCodeStr + ' ) { ';
	
	if ( isBlock )
		codeStr += origCodeStr;
	else
		codeStr += ' return ' + origCodeStr + ';';

	codeStr += ' }}';
	return codeStr;
}


function add_attr_code_chain( codeStr, chain )
{
	if ( StrContains( codeStr, 'return ' ) )
	{
		codeStr = 'var _retVal; ' + StrReplace( codeStr, 'return ', '_retVal = ' );
		codeStr += ' return _retVal' + chain;
	}
	else
	{
		codeStr += chain;
	}

	return codeStr;
}


function build_xquery_qual( viewID, source )
{
	param = build_view_param( viewID, UrlParam( source.Doc.Url ) );

	xqueryQual = '';

	for ( staticFilter in param.view.static_filters )
	{
		if ( staticFilter.xquery_qual_expr.HasValue )
		{
			with ( source.filter )
			{
				subQual = eval( staticFilter.xquery_qual_expr );
			}

			if ( subQual != '' )
				xqueryQual += ' and ' + subQual;

			continue;
		}

		if ( ! param.recordForm.PathExists( staticFilter.id ) )
			throw 'No such field: ' + staticFilter.id;

		elem = param.recordForm.EvalPath( staticFilter.id );

		if ( elem.IsMultipleRecChild( param.recordForm ) && staticFilter.cmp_pred == 'equal' )
		{
			xqueryQual += ' and MatchSome( $elem/' + StrReplace( staticFilter.id, '.', '/' ) + ', ';
		}
		else
		{
			xqueryQual += ' and $elem/' + StrReplace( staticFilter.id, '.', '/' );
			
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
			if ( elem.IsMethod )
			{
				if ( staticFilter.value == 'false' || staticFilter.value == 'true' )
					elemType = 'bool';
				else
					elemType = 'string';
			}
			else
			{
				elemType = elem.ResultDataType;
			}

			valueElem = CreateDynamicElem( 'v', elemType );
			valueElem.XmlValue = staticFilter.value;

			xqueryQual += valueElem.XQueryLiteral;
		}

		if ( elem.IsMultipleRecChild( param.recordForm ) && staticFilter.cmp_pred == 'equal' )
		{
			xqueryQual += ' )';
		}
	}

	xqueryQual += build_xquery_dyn_qual( param, source, '', '$elem' );

	//if ( param.catalogName == 'divisions' )
		//DebugMsg(xqueryQual);
	return xqueryQual;
}


function build_xquery_dyn_qual( param, source, joinCatalogName, varName )
{
	//DebugMsg( param.view.id );
	xqueryQual = '';

	for ( dynFilter in param.view.dyn_filters )
	{
		if ( dynFilter.validate_action.HasValue )
		{
			with ( source.filter )
			{
				eval( dynFilter.validate_action );
			}
		}

		if ( dynFilter.is_join_switcher )
		{
			if ( joinCatalogName != '' )
				continue;
		}
		else
		{
			if ( dynFilter.join_catalog_name != joinCatalogName )
				continue;
		}

		elem = get_dyn_filter_target_elem( param, dynFilter );

		for ( filterElemName in get_dyn_filter_elem_names( dynFilter, elem ) )
		{
			if ( dynFilter.is_auto && ! source.PathExists( 'filter.' + filterElemName ) )
			{
				//DebugMsg( source.Name );
				filterElem = CreateDynamicElem( 't', 'integer' );
				filterElem.Value = source.Doc.DocID;
			}
			else
			{
				try
				{
					filterElem = GetObjectProperty( source.filter, filterElemName );
				}
				catch( e )
				{
					//alert( filterElemName );
					throw e;
				}
			}

		//DebugMsg( dynFilter.Xml );
		//DebugMsg( filterElem.Xml );
			if ( dynFilter.is_join_switcher )
			{
				if ( ! dynFilter.is_auto && ! filterElem.HasValue )
					continue;
			}
			else
			{
				if ( ! filterElem.HasValue )
				{
					if ( dynFilter.is_auto && ! dynFilter.is_optional )
						xqueryQual += ' and false()';
						
					continue;
				}
			}

			if ( dynFilter.xquery_qual_expr.HasValue )
			{
				with ( source.filter )
				{
					subQual = eval( dynFilter.xquery_qual_expr );
				}

				if ( subQual != '' )
				{
					subQual = AdjustLegacyXQuerySubQual( subQual );
					xqueryQual += ' and ' + subQual;
				}

				continue;
			}

			xqueryQual += ' and ';

			if ( dynFilter.is_join_switcher )
			{
				xqueryQual += '( some $otherElem in ' + dynFilter.join_catalog_name + ' satisfies ( $otherElem/' + dynFilter.join_key + ' = $elem/id';
				xqueryQual += build_xquery_dyn_qual( param, source, dynFilter.join_catalog_name, '$otherElem' );
				xqueryQual += ' ) )';
			}
			else if ( dynFilter.use_ft )
			{
				xqueryQual += 'doc-contains( $elem/id, \'\', ' + filterElem.XQueryLiteral + ' )';
				xqueryQual += ' and contains( $elem/' + StrReplace( dynFilter.id, '.', '/' ) + ', ' + filterElem.XQueryLiteral + ' )';
			}
			else
			{
				if ( filterElem.IsMultiElem )
					xqueryQual += 'MatchSome( ';
				else if ( elem.IsMultipleRecChild( param.recordForm ) && ! dynFilter.join_catalog_name.HasValue )
					xqueryQual += 'MatchSome( ';
				else if ( dynFilter.id == 'parent_id' && param.objectForm.IsHier )
					xqueryQual += 'IsHierChild( ';
				else if ( dynFilter.use_foreign_rec_child )
					xqueryQual += 'CatalogIsHierRecChild( \'' + elem.ForeignArrayExpr + '\',' + filterElem.XQueryLiteral + ', ';
				//else if ( elem.ResultDataType == 'string' && elem.ForeignArrayStr == '' )
					//xqueryQual += 'contains( ';

				xqueryQual += varName + '/' + StrReplace( dynFilter.id, '.', '/' );

				if ( filterElem.IsMultiElem )
					xqueryQual += ', ';
				else if ( elem.IsMultipleRecChild( param.recordForm ) && ! dynFilter.join_catalog_name.HasValue )
					xqueryQual += ', ';
				else if ( dynFilter.id == 'parent_id' && param.objectForm.IsHier )
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
				else if ( elem.IsMultipleRecChild( param.recordForm ) && ! dynFilter.join_catalog_name.HasValue )
					xqueryQual += ' )';
				else if ( dynFilter.id == 'parent_id' && param.objectForm.IsHier )
					xqueryQual += ' )';
				else if ( dynFilter.use_foreign_rec_child )
					xqueryQual += ' )';
			}
		}
	}

	return xqueryQual;
}


function AdjustLegacyXQuerySubQual( subQual )
{
	if ( ! base1_config.use_ft_v2 )
		return subQual;

	if ( ! StrContains( subQual, 'doc-contains(' ) )
		return subQual;

	if ( ( obj = StrOptScan( subQual, '%s[skill.%s]%s' ) ) != undefined )
	{
		subQual = StrReplaceOne( subQual, '[', '' );
		subQual = StrReplaceOne( subQual, '>=', ' >= ' );
		subQual = StrReplaceOne( subQual, '[', '' );
	}

	return subQual;
}


function is_some_filter_applied( viewID, source )
{
	param = build_view_param( viewID, UrlParam( source.Doc.Url ) );

	if ( ! source.ChildExists( 'filter' ) )
		return false;

	for ( filterElem in source.filter )
	{
		if ( ( dynFilter = param.view.dyn_filters.GetOptChildByKey( StrReplace( filterElem.Name, '__', '.' ) ) ) != undefined && dynFilter.is_auto )
		{
			continue;
		}

		if ( filterElem.HasValue )
			return true;
	}

	return false;
}



function clear_filters( viewID, source )
{
	param = build_view_param( viewID, UrlParam( source.Doc.Url ) );

	excptElemNames = ArrayExpand( ArraySelect( param.view.dyn_filters, 'is_auto' ), 'get_dyn_filter_elem_names( This )' );

	for ( elem in ArraySelectAll( source.filter ) )
	{
		if ( ArrayOptFind( excptElemNames, 'This == elem.Name' ) != undefined )
			continue;

		if ( elem.FormElem.Expr != '' )
			continue;

		if ( elem.IsMultiple )
			elem.Delete();
		else
			elem.Clear();
	}
}



function adjust_filters( viewID, source )
{
	param = build_view_param( viewID, UrlParam( source.Doc.Url ) );

	for ( dynFilter in param.view.dyn_filters )
	{
		if ( dynFilter.is_auto )
			continue;

		if ( dynFilter.is_multiple )
		{
			multiElem = GetObjectProperty( source.filter, ArrayFirstElem( get_dyn_filter_elem_names( dynFilter ) ) );

			if ( DefaultDb.GetOptCatalog( multiElem.FormElem.ForeignArrayExpr ) == undefined )
				continue;
			
			if ( ! lib_base.has_catalog_filter_constraints( param.catalogName, dynFilter.id ) )
				continue;

			for ( elem in ArraySelectAll( multiElem ) )
			{
				if ( ! lib_base.match_catalog_filter_constraints( param.catalogName, dynFilter.id, elem.Value ) )
					elem.Delete();
			}

			if ( ArrayCount( multiElem ) == 0 )
			{
				lib_base.adjust_catalog_filter_with_constraint( param.catalogName, dynFilter.id, multiElem );
			}
		}
		else
		{
			elem = source.filter.Child( ArrayFirstElem( get_dyn_filter_elem_names( dynFilter ) ) )

			if ( DefaultDb.GetOptCatalog( elem.FormElem.ForeignArrayExpr ) != undefined && lib_base.has_catalog_filter_constraints( param.catalogName, dynFilter.id ) )
			{
				if ( ! lib_base.match_catalog_filter_constraints( param.catalogName, dynFilter.id, elem.Value ) )
					lib_base.adjust_catalog_filter_with_constraint( param.catalogName, dynFilter.id, elem );
			}
		}
	}
}



function get_store_view( viewID )
{
	storeDoc = FetchDoc( 'x-local://data_local/base1_views_stored_data.xml' );
	return storeDoc.TopElem.views.ObtainChildByKey( viewID );
}


function load_stored_filters( viewID, filters )
{
	storeDoc = FetchDoc( 'x-local://data_local/base1_views_stored_data.xml' );

	storedView = storeDoc.TopElem.views.GetOptChildByKey( viewID );
	if ( storedView == undefined )
		return;

	for ( storedElem in storedView.filter )
	{
		filterFormElem = filters.FormElem.OptChild( storedElem.Name );
		if ( filterFormElem == undefined )
			continue;

		if ( filterFormElem.IsMultiple )
		{
			filterMultiElem = GetObjectProperty( filters, storedElem.Name );
			filterElem = filterMultiElem.Add();
		}
		else
		{
			filterElem = filters.Child( storedElem.Name );
		}

		filterElem.AssignElem( storedElem );
	}

	/*
	for ( filterElem in filters )
	{
		storedElem = storedView.filter.OptChild( filterElem.Name );
		if ( storedElem == undefined )
			continue;

		filterElem.AssignElem( storedElem );
	}
	*/
}


function load_stored_filter_elem( statID, filterElem )
{
	storeDoc = FetchDoc( 'x-local://data_local/base1_views_stored_data.xml' );

	storedView = storeDoc.TopElem.views.GetOptChildByKey( statID );
	if ( storedView == undefined )
		return;

	storedElem = storedView.filter.OptChild( filterElem.Name );
	if ( storedElem == undefined )
		return;

	filterElem.AssignElem( storedElem );
}


function clear_stored_filters( viewID )
{
	storedView = get_store_view( viewID );
	storedView.Clear();
	storedView.Doc.SetChanged( true );
}


function store_filter_elem( viewID, filterElem )
{
	/*if ( filterElem.IsMultiElem )
	{
		DebugMsg(filterElem.Xml);
		return;
	}*/

	storedView = get_store_view( viewID );

	for ( storedElem in ArraySelect( storedView.filter, 'Name == filterElem.Name' ) )
		storedElem.Delete();

	for ( filterElemInstance in filterElem.Instances )
	{
		storedElem = storedView.filter.AddDynamicChild( filterElem.Name, filterElemInstance.Type );
		storedElem.AssignElem( filterElemInstance );
	}

	storedView.Doc.SetChanged( true );
}


function use_preview( viewID )
{
	return get_store_view( viewID ).use_preview;
}


function set_use_preview( viewID, usePreview )
{
	storedView = get_store_view( viewID );

	storedView.use_preview = usePreview;
	storedView.Doc.SetChanged( true );
}


function get_opt_active_view_list_item()
{
	list = OptFocusItem;
	if ( list != undefined && list.Type == 'LIST' )
		return list;

	screen = FindOptScreen( 'FrameMain' );
	if ( screen != undefined )
	{
		list = screen.FindOptItem( 'MainList' );
		if ( list != undefined )
			return list;
	}

	return undefined;
}


function calc_measure_hash( param )
{
	crc = CRC( param.view.id ) + StrLen( param.view.id );
	return crc % 10;
}


function measure_to_zr_num( measure, boundLen )
{
	if ( ( pos = StrOptSubStrRightPos( measure, 'zr' ) ) != undefined )
	{
		return Int( StrLeftRange( measure, pos ) );
	}
	else if ( ( pos = StrOptSubStrRightPos( measure, 'zrc' ) ) != undefined )
	{
		return Int( StrLeftRange( measure, pos ) );
	}
	else if ( ( pos = StrOptSubStrRightPos( measure, '%' ) ) != undefined )
	{
		return ( Int( StrLeftRange( measure, pos ) ) * boundLen ) / 100;
	}
	else
	{
		DebugMsg( measure );
		return 10;
	}
}


function handle_add_new_elem_in_select_dlg( viewID, screen )
{
	param = build_view_param( viewID );

	name = lib_base.select_string_value( param.objectForm.Title, '' );
	if ( name == '' )
		throw UiError( UiText.errors.name_not_specified );

	doc = DefaultDb.OpenNewObjectDoc( param.objectForm.TopElem.Name );
	doc.TopElem.name = name;
	doc.Save();

	screen.Doc.TopElem.object_id.Add().Value = doc.TopElem.id;
	screen.RunCommand( 'Ok' );
}


function handle_change_view_filters( screen )
{
	viewID = UrlQuery( screen.Doc.Url ).id;
	param = build_view_param( viewID, UrlParam( screen.Doc.Url ) );

	dlgDoc = OpenNewDoc( 'base1_dlg_view_filters.xml' );
	dlgDoc.TopElem.view_ref = param.view;
	dlgDoc.TopElem.param_ref = param;
	dlgDoc.TopElem.use_subst = UseLds;

	ModalDlg( dlgDoc );

	handle_change_view_from_dlg( param, dlgDoc, screen.Doc.Url );
}


function handle_change_view_columns( screen )
{
	viewID = UrlQuery( screen.Doc.Url ).id;
	param = build_view_param( viewID, UrlParam( screen.Doc.Url ) );

	dlgDoc = OpenNewDoc( 'base1_dlg_view_columns.xml' );
	dlgDoc.TopElem.view_ref = param.view;
	dlgDoc.TopElem.param_ref = param;
	dlgDoc.TopElem.use_subst = UseLds;

	ModalDlg( dlgDoc );

	handle_change_view_from_dlg( param, dlgDoc, screen.Doc.Url );
}


function handle_reset_subst_view( screen )
{
	viewID = UrlQuery( screen.Doc.Url ).id;

	view = subst_views.views.GetOptChildByKey( viewID );
	if ( view == undefined )
		return;

	lib_base.ask_warning_to_continue( screen, UiText.messages.subst_view_will_be_reset );

	view.Delete();
	view.Doc.Save();

	drop_cached_view_screens( viewID );
}


function has_subst_view( screen )
{
	if ( screen.OptDoc == undefined )
		return false;
	
	viewID = UrlQuery( screen.Doc.Url ).id;
	return ( subst_views.views.GetOptChildByKey( viewID ) != undefined );
}


function handle_change_view_from_dlg( param, dlgDoc, viewUrl )
{
	if (dlgDoc.TopElem.use_subst)
	{
		view = subst_views.views.ObtainChildByKey( param.view.id );
	}
	else
	{
		viewDoc = DefaultDb.OpenObjectDoc( 'view', param.view.id );
		view = viewDoc.TopElem;
	}

	view.AssignElem( param.view );
	view.drop_all_dyn_filters = true;

	if ( StrContains( UrlParam( viewUrl ), '&' ) )
	{
		extFilter = UrlQuery( viewUrl );

		for ( staticFilter in ArraySelectAll( view.static_filters ) )
		{
			if ( extFilter.HasProperty( staticFilter.id ) )
			{
				staticFilter.Delete();
			}
		}
	}

	if ( dlgDoc.TopElem.use_subst )
	{
		view.Doc.Save();
	}
	else
	{
		view.was_customized = true;
		viewDoc.Save();

		view = subst_views.views.GetOptChildByKey( param.view.id );
		if ( view != undefined )
		{
			view.Delete();
			view.Doc.Save();
		}
	}

	drop_cached_view_screens( param.view.id, viewUrl );
}


function drop_cached_view_screens( viewID, viewUrl )
{
	baseViewUrl = 'x-app://base1/base1_generic_view.xml?id=' + viewID;

	for ( cachedDoc in GetAllCachedDocs() )
	{
		if ( cachedDoc.Url == baseViewUrl || StrBegins( cachedDoc.Url, baseViewUrl + '&' ) )
			drop_cached_view_screen( viewID, cachedDoc, viewUrl );
	}

	for ( screen in AllScreens )
	{
		if ( screen.OptDoc == undefined )
			continue;

		if ( GetOptCachedDoc( screen.Doc.Url ) != undefined )
			continue;

		if ( screen.Doc.Url == baseViewUrl || StrBegins( screen.Doc.Url, baseViewUrl + '&' ) )
			drop_cached_view_screen( viewID, screen.Doc, viewUrl );
	}
}


function drop_cached_view_screen( viewID, cachedDoc, viewUrl )
{
	cachedDoc.RemoveFromCache();
	DropFormsCache( cachedDoc.Url );
	DropScreenFormsCache( ReplaceUrlPathSuffix( cachedDoc.Url, '.xml', '.xms' ) );

	extQuery = UrlParam( cachedDoc.Url );
	if ( StrContains( extQuery, '&' ) )
		extQuery = StrReplaceOne( extQuery, 'id=' + viewID + '&', '' );
	else
		extQuery = undefined;

	viewUrl = obtain_view_url( viewID, extQuery );

	screen = FindOptScreenByDocUrl( cachedDoc.Url );
	if ( screen == undefined )
		return;

	screen.Navigate( cachedDoc.Url );
}


function insert_form_elem_id( param, formElem, destArray )
{
	lastDestElem = undefined;
	outerFormElem = get_outer_form_elem( formElem );

	for ( otherFormElem in param.recordForm )
	{
		if ( otherFormElem === outerFormElem )
			break;

		destElem = destArray.GetOptChildByKey( otherFormElem.Name, 'id' );
		if ( destElem != undefined )
			lastDestElem = destElem;
	}

	if ( lastDestElem != undefined )
		destElem = destArray.InsertChild( lastDestElem.ChildIndex + 1 );
	else
		destElem = destArray.InsertChild( 0 );
	
	destElem.id = lib_view.get_record_form_elem_relative_path( param.recordForm, formElem );
	return destElem;
}


function get_simple_array_inner_key_form_elem( formElem )
{
	if ( ArrayCount( formElem ) != 1 )
		return undefined;

	subFormElem = formElem[0];

	if ( ! subFormElem.IsMultiple )
		return undefined;

	if ( ArrayCount( subFormElem ) == 0 )
		return undefined;

	keyFormElem = subFormElem[0];
	if ( keyFormElem.ForeignArrayExpr == '' )
		return undefined;

	return keyFormElem;
}


function get_form_elem_upper_title( formElem )
{
	curFormElem = formElem;

	while ( true )
	{
		if ( curFormElem.Title != '' )
			return curFormElem.Title;

		curFormElem = curFormElem.OptParent;
		if ( curFormElem == undefined )
			break;
	}

	return '';
}


function get_outer_form_elem( formElem )
{
	curFormElem = formElem;

	while ( true )
	{
		if ( curFormElem.OptParent.OptParent.OptParent == undefined )
			return curFormElem;
		
		curFormElem = curFormElem.OptParent;
	}
}


function get_record_form_elem_relative_path( baseFormElem, formElem )
{
	path = formElem.Name;
	curFormElem = formElem.OptParent;

	while ( true )
	{
		if ( curFormElem == undefined || curFormElem === baseFormElem )
			break;

		path = curFormElem.Name + '.' + path;
		curFormElem = curFormElem.OptParent;
	}

	return path;
}




function HandleOpenSectionInNewWindow()
{
	srcScreen = FindScreen( 'FrameMain' );
	url = srcScreen.Doc.Url;
	query = UrlQuery( url );
	query.new_window = '1';
	
	newUrl = Url( UrlSchema( url ), UrlHost( url ), UrlPath( url ), UrlEncodeQuery( query ) );

	newDoc = OpenNewDoc( srcScreen.Doc.FormUrl );
	newDoc.TopElem.AssignElem( srcScreen.Doc.TopElem );
	newDoc.Url = newUrl;

	if ( newDoc.TopElem.Name == 'view_resp_candidates' ) //!!!
	{
		//newDoc.TopElem.filter.Clear();
		//newDoc.TopElem.BuildEntries();
		//newDoc.TopElem.OnSetListSelection( undefined );
	}

	newScreen = CreateDocScreen( newDoc );
}


function ElemMatchesViewFilter( elem, viewFilter )
{
	if ( viewFilter == undefined )
		return true;

	for ( fieldName in viewFilter )
	{
		filterValue = viewFilter.GetProperty( fieldName );
		field = GetObjectProperty( elem, fieldName );
		
		if ( field.IsMultiElem )
		{
			if ( ! field.ByValueExists( filterValue ) )
				return false;
		}
		else
		{
			if ( field.Value != filterValue )
				return false;
		}
	}

	return true;
}


function BuildPreparedLoopArray( array, list )
{
	sortInfo = list.GetCurCodeSortInfo();
	return eval( 'ArraySort( array, ' + sortInfo + ' )' );
}



function HandlePlaceRecordBefore( record, destRecordID )
{
	catalog = DefaultDb.GetOptCatalog( lib_base.object_name_to_catalog_name( record.Name ) );
	destRecord = GetOptForeignElem( catalog, destRecordID );

	siblingsArray = XQuery( 'for $elem in ' + catalog.Name + ' where $elem/parent_id = ' + destRecord.parent_id.XQueryLiteral + ' return $elem' );
	siblingsArray = ArraySort( siblingsArray, 'order_index', '+' );

	curOrderIndex = 0;

	for ( siblingRecord in siblingsArray )
	{
		if ( siblingRecord.id == destRecordID )
		{
			doc = OpenDoc( record.ObjectUrl );
			doc.TopElem.parent_id = destRecord.parent_id;
			doc.TopElem.order_index = curOrderIndex;
			doc.WriteDocInfo = false;
			doc.RunActionOnSave = false;
			doc.Save();
			curOrderIndex++;
		}

		if ( siblingRecord.id == record.id )
			continue;

		if ( siblingRecord.order_index >= curOrderIndex )
		{
			curOrderIndex = siblingRecord.order_index + 1;
		}
		else
		{
			doc = OpenDoc( siblingRecord.ObjectUrl );
			doc.TopElem.order_index = curOrderIndex;
			doc.WriteDocInfo = false;
			doc.RunActionOnSave = false;
			doc.Save();
			curOrderIndex++;
		}
	}
}


function HandlePlaceRecordAfter( record, destRecordID )
{
	catalog = DefaultDb.GetOptCatalog( lib_base.object_name_to_catalog_name( record.Name ) );
	destRecord = GetOptForeignElem( catalog, destRecordID );

	siblingsArray = XQuery( 'for $elem in ' + catalog.Name + ' where $elem/parent_id = ' + destRecord.parent_id.XQueryLiteral + ' return $elem' );
	siblingsArray = ArraySort( siblingsArray, 'order_index', '+' );

	curOrderIndex = 0;

	for ( siblingRecord in siblingsArray )
	{
		if ( siblingRecord.id == record.id )
			continue;

		if ( siblingRecord.order_index >= curOrderIndex )
		{
			curOrderIndex = siblingRecord.order_index + 1;
		}
		else
		{
			doc = OpenDoc( siblingRecord.ObjectUrl );
			doc.TopElem.order_index = curOrderIndex;
			doc.WriteDocInfo = false;
			doc.RunActionOnSave = false;
			doc.Save();
			curOrderIndex++;
		}

		if ( siblingRecord.id == destRecordID )
		{
			doc = OpenDoc( record.ObjectUrl );
			doc.TopElem.parent_id = destRecord.parent_id;
			doc.TopElem.order_index = curOrderIndex;
			doc.WriteDocInfo = false;
			doc.RunActionOnSave = false;
			doc.Save();
			curOrderIndex++;
		}
	}
}


function ReloadObjectPreview( object )
{
	UpdateScreens( '*', '*' + lib_base.object_name_to_catalog_name( object.Name ) + '*' );

	if ( object.OptScreen != undefined )
		object.Screen.SetDoc( OpenDoc( object.Screen.Doc.Url ), object.Screen.FormUrl );
}


function ShowScreenInExcel( screen, list )
{
	if ( ! System.IsWebClient && base1_config.sn_owner != 'test' )
	{
		lib_office.show_screen_in_calc( screen );
		return;
	}

	if ( list == undefined )
	{
		list = screen.FindOptItem( 'MainList' );
		if ( list == undefined )
			return;
	}

	//if ( list.CurXQueryStr == '' )
	//{
		ui_client.ShowListInExcel( list );
		return;
	//}*/

	/*if ( screen.Doc.TopElem.FormElem.ChildExists( 'viewParam' ) )
	{
		param = screen.Doc.TopElem.viewParam;
	}
	else
	{
		//DebugMsg(screen.Doc.TopElem.Xml)
		viewInfo = ParseViewUrl( screen.Doc.Url );
		if ( viewInfo == undefined )
			return;

		param = build_view_param( viewInfo.viewID, viewInfo.extQuery );
	}

	querySpec = new ui_base.uni_query_spec;
	querySpec.catalog_name = param.catalogName;
	querySpec.is_hier = param.objectForm.IsHier && ! StrContains( list.CurXQueryStr, 'doc-contains(' );
	//querySpec.xquery_qual_str = build_xquery_qual( param.view.id, screen.Doc.TopElem );
	//querySpec.xquery_order_str = list.GetCurXQuerySortInfo( '$elem' );
	querySpec.xquery_str = list.CurXQueryStr;

	querySpec.columns = new Array;

	for ( field in param.view.fields )
	{
		columnSpec = new ui_base.column_spec;
		querySpec.columns.push( columnSpec );

		columnSpec.id = field.id;
		
		if ( field.col_title.HasValue )
			columnSpec.title = field.col_title;
		
		if ( field.title_expr.HasValue )		
			columnSpec.value_expr = field.title_expr;

		if ( field.text_color_expr.HasValue )		
			columnSpec.text_color_expr = field.text_color_expr;

		if ( field.bk_color_expr.HasValue )		
			columnSpec.bk_color_expr = field.bk_color_expr;

		if ( field.align.HasValue )		
			columnSpec.align = field.align;

		if ( field.width.HasValue )		
			columnSpec.width = field.width;

		if ( field.time_only )
			columnSpec.show_time_only = true;
		else if ( field.use_time )
			columnSpec.show_time = true;
	}


	task = new BackgroundTask;
	task.RunOnServer = true;
	task.ShowProgress = true;

	respInfo = task.CallMethod( 'ui_server_excel_utils', 'BuildExcelFileFromQuerySpec', [querySpec] );

	ShellExecute( 'open', respInfo.fileUrl );*/
}


function ParseViewUrl( viewUrl )
{
	if ( ! StrBegins( viewUrl, 'x-app://base1/base1_generic_view.xml?' ) )
		return undefined;
	
	query = UrlQuery( viewUrl );

	viewInfo = new Object;
	viewInfo.viewID = query.id;

	if ( StrContains( UrlParam( viewUrl ), '&' ) )
	{
		viewInfo.extQuery = UrlQuery( StrReplaceOne( viewUrl, '?id=' + viewInfo.viewID + '&', '?' ) );
	}
	else
	{
		viewInfo.extQuery = undefined;
	}

	return viewInfo;
}