function BuildUiParamEntry( entry, paramValue1, paramValue2 )
{
	if ( StrContains( entry.Value, '%s1' ) )
	{
		str = StrReplace( entry.Value, '%s1', paramValue1 );

		if ( paramValue2 != undefined )
			str = StrReplace( str, '%s2', paramValue2 );
	}
	else
	{
		str = StrReplaceOne( entry.Value, '%s', paramValue1 );

		if ( paramValue2 != undefined )
			str = StrReplaceOne( str, '%s', paramValue2 );
	}
	
	return str;
}


function get_elem_all_lang_attr( elem, coreAttrName )
{
	array = new Array;

	for ( attrName in elem.AttrNames )
	{
		if ( attrName == coreAttrName || ( StrBegins( attrName, 'lang-' ) && StrEnds( attrName, ':' + coreAttrName ) ) )
			array.push( elem.GetAttr( attrName ) );
	}

	return array;
}


function dlg_footer_height()
{
	return '-8zr';
}


function select_object( objectType )
{
	return select_object_from_catalog( object_name_to_catalog_name( objectType ) );
}


function select_object_from_catalog( catalogName, defaultFilter )
{
	if ( ArrayOptFindByKey( views, catalogName ) != undefined )
		return select_object_from_view( catalogName, defaultFilter );
	else
		return select_object_with_dlg( catalogName, defaultFilter );
}


function select_objects_from_catalog( catalogName, defaultFilter, allowMultiSelect )
{
	if ( ArrayOptFindByKey( views, catalogName ) != undefined )
		return select_objects_from_view( catalogName, defaultFilter, allowMultiSelect );
	else
		return select_objects_with_dlg( catalogName, defaultFilter, allowMultiSelect );
}


function select_object_from_view( viewID, defaultFilter )
{
	return ArrayFirstElem( select_objects_from_view( viewID, defaultFilter, false ) );
}


function select_object_with_dlg( viewID, defaultFilter )
{
	return ArrayFirstElem( select_objects_with_dlg( viewID, defaultFilter, false ) );
}


function select_objects_from_view( viewID, defaultFilter, allowMultiSelect )
{
	if ( allowMultiSelect == undefined )
		allowMultiSelect = true;

	dlgDoc = OpenNewDoc( lib_view.obtain_view_dlg_url( viewID, ( defaultFilter != undefined ? UrlEncodeQuery( defaultFilter ) : undefined ) ) );
	
	if ( defaultFilter != undefined )
	{
		param = lib_view.build_view_param( viewID );
		extQuery = lib_view.extract_mod_ext_query( param, UrlEncodeQuery( defaultFilter ) );

		if ( extQuery != undefined )
			dlgDoc.Url = 'x-app://x-temp/1.xml?' + extQuery;
	}

	lib_view.load_stored_filters( viewID, dlgDoc.TopElem.filter );
	
	if ( defaultFilter != undefined )
	{
		for ( filterElem in dlgDoc.TopElem.filter )
		{
			if ( defaultFilter.HasProperty( filterElem.Name ) )
			{
				filterElem.Value = defaultFilter.GetProperty( filterElem.Name );
			}
		}
	}

	dlgDoc.TopElem.allow_multi_select = allowMultiSelect;

	ActiveScreen.ModalDlg( dlgDoc );
	return dlgDoc.TopElem.object_id;
}


function select_objects_with_dlg( catalogName, defaultFilter, allowMultiSelect )
{
	if ( allowMultiSelect == undefined )
		allowMultiSelect = true;

	dlgDoc = OpenNewDoc( 'base1_dlg_object_select.xml' );
	dlgDoc.TopElem.catalog_name = catalogName;
	
	if ( false && defaultFilter != undefined )
	{
		for ( filterElem in dlgDoc.TopElem.filter )
		{
			if ( defaultFilter.HasProperty( filterElem.Name ) )
				filterElem.Value = defaultFilter.GetProperty( filterElem.Name );
		}
	}

	dlgDoc.TopElem.allow_multi_select = allowMultiSelect;

	ActiveScreen.ModalDlg( dlgDoc );
	return dlgDoc.TopElem.object_id;
}


function select_elems( array )
{
	dlg = OpenDoc( 'base1_dlg_elem_select.xml' );
	dlg.TopElem.array_ref = array;
	dlg.TopElem.multi_select = true;
	
	ActiveScreen.ModalDlg( dlg );
	return dlg.TopElem.sel_array;
}


function select_elem( array, primaryDispName )
{
	dlg = OpenDoc( 'base1_dlg_elem_select.xml' );
	dlg.TopElem.array_ref = array;

	if ( primaryDispName != undefined )
		dlg.TopElem.primary_disp_name = primaryDispName;

	dlg.TopElem.multi_select = false;
	
	ActiveScreen.ModalDlg( dlg );
	return ArrayFirstElem( dlg.TopElem.sel_array );
}


function select_string_value( title, defaultValue )
{
	dlgDoc = OpenNewDoc( 'base1_dlg_value.xml' );
	dlgDoc.TopElem.title = title;
	dlgDoc.TopElem.data_type = 'string';
	dlgDoc.TopElem.string_value = defaultValue;

	ActiveScreen.ModalDlg( dlgDoc );
	return dlgDoc.TopElem.string_value;
}


function select_integer_value( title, defaultValue )
{
	dlgDoc = OpenNewDoc( 'base1_dlg_value.xml' );
	dlgDoc.TopElem.title = title;
	dlgDoc.TopElem.data_type = 'integer';
	dlgDoc.TopElem.integer_value = defaultValue;

	ActiveScreen.ModalDlg( dlgDoc );
	return dlgDoc.TopElem.integer_value;
}


function select_real_value( title, defaultValue )
{
	dlgDoc = OpenNewDoc( 'base1_dlg_value.xml' );
	dlgDoc.TopElem.title = title;
	dlgDoc.TopElem.data_type = 'real';
	dlgDoc.TopElem.real_value = defaultValue;

	ActiveScreen.ModalDlg( dlgDoc );
	return dlgDoc.TopElem.real_value;
}


function select_date_value( title, defaultValue )
{
	dlgDoc = OpenNewDoc( 'base1_dlg_value.xml' );
	dlgDoc.TopElem.title = title;
	dlgDoc.TopElem.data_type = 'date';
	
	if ( defaultValue != undefined )
		dlgDoc.TopElem.date_value = defaultValue;

	ActiveScreen.ModalDlg( dlgDoc );
	return dlgDoc.TopElem.date_value;
}


function object_name_to_catalog_name( objectName )
{
	if ( StrEnds( objectName, 'y' ) && ! StrEnds( objectName, 'day' ) )
		return StrLeftRange( objectName, StrLen( objectName ) - 1 ) + 'ies';
	else if ( StrEnds( objectName, 's' ) || StrEnds( objectName, 'x' ) || StrEnds( objectName, 'ch' ) )
		return objectName + 'es';
	else 
		return objectName + 's';
}


function catalog_name_to_opt_object_name( catalogName )
{
	if ( StrEnds( catalogName, 'ies' ) )
		return StrLeftRange( catalogName, StrLen( catalogName ) - 3 ) + 'y';
	else if ( StrEnds( catalogName, 'expenses' ) || StrEnds( catalogName, 'phases' ) ) 
		return StrLeftRange( catalogName, StrLen( catalogName ) - 1 );
	else if ( StrEnds( catalogName, 'ses' ) || StrEnds( catalogName, 'xes' ) ) 
		return StrLeftRange( catalogName, StrLen( catalogName ) - 2 );
	else if ( StrEnds( catalogName, 's' ) ) 
		return StrLeftRange( catalogName, StrLen( catalogName ) - 1 );
	else
		return '';
}


function catalog_name_to_object_name( catalogName )
{
	objectName = catalog_name_to_opt_object_name( catalogName );
	if ( objectName == '' )
		throw 'Invalid catalog name: ' + catalogName;

	return objectName;
}


function is_valid_object_id( value )
{
	try
	{
		Int( value );
		return true;
	}
	catch ( e )
	{
	}

	if ( StrContains( value, ' ' ) )
		return false;

	if ( StrContains( value, '/' ) )
		return false;

	return true;
}


function FieldNameToMethodName( fieldName )
{
	strArray = String( fieldName ).split( '_' );
	return ArrayMerge( strArray, 'StrTitleCase( This )' );
}


function VarNameToFieldName( varName )
{
	strArray = StrToCharArray( varName );
	strArrayLc = StrToCharArray( StrLowerCase( varName ) );
	fieldName = '';
	
	for ( i = 0; i < strArrayLc.length; i++ )
	{
		if ( i != 0 && strArrayLc[i] != strArray[i] )
			fieldName += '_';

		fieldName += strArrayLc[i];
	}

	return fieldName;
}


function is_catalog_hier_child( catalog, id, baseID )
{
	record = ArrayOptFindByKey( catalog, id );

	while ( true )
	{
		if ( record == undefined )
			return false;

		if ( ! record.parent_id.HasValue )
			return false;

		if ( record.parent_id == baseID )
			return true;

		record = ArrayOptFindByKey( catalog, record.parent_id );
	}
}


function is_catalog_hier_child_or_self( catalog, id, baseID )
{
	if ( id == baseID )
		return true;

	return is_catalog_hier_child( catalog, id, baseID );
}


function get_hier_chain( catalog, id )
{
	array = new Array;
	curID = id;

	while ( true )
	{
		elem = GetOptForeignElem( catalog, curID );
		if ( elem == undefined )
			break;

		array.push( elem );

		if ( ! elem.parent_id.HasValue )
			break;

		if ( array.length >= 32 )
			break;

		curID = elem.parent_id;
	}

	return array;
}


function get_hier_desc_chain( catalog, id )
{
	chain = get_hier_chain( catalog, id )
	count = ArrayCount( chain )

	descChain = new Array( count );

	for ( i = 0; i < count; i++ )
		descChain[i] = chain[( count - i ) - 1];

	return descChain;
}


function get_topmost_hier_id( catalog, id )
{
	array = get_hier_chain( catalog, id );
	if ( array.length == 0 )
		return null;

	return array[array.length - 1].id;
}


function get_topmost_hier_record( catalog, origRecord )
{
	array = get_hier_chain( catalog, origRecord.id );
	if ( array.length == 0 )
		return undefined;

	return array[array.length - 1];
}


function BuildRecordExternalDispName( record )
{
	cardObjectType = ArrayOptFindByKey( card_object_types, record.Name );
	if ( cardObjectType == undefined )
		return record.PrimaryDispName;

	catalog = DefaultDb.GetOptCatalog( lib_base.object_name_to_catalog_name( record.Name ) );

	if ( cardObjectType.use_reverse_hier_disp_name )
	{
		chain = get_hier_chain( catalog, record.id );
		delimStr = '  ' + StrFromCharCodesArray( [171] ) + '  ';
	}
	else
	{
		chain = get_hier_desc_chain( catalog, record.id );
		delimStr = '  ' + StrFromCharCodesArray( [187] ) + '  ';
	}

	return ArrayMerge( chain, 'This.PrimaryDispName', delimStr );
}


function BuildCardInfoUserDispName( baseElem )
{
	if ( global_settings.user_primary_disp_name == 'login' )
		return baseElem.user_login;

	if ( baseElem.user_id.HasValue )
	{
		user = baseElem.user_id.OptForeignElem;
		if ( user == undefined )
			user = GetOptForeignElem( persons, baseElem.user_id );
		if ( user == undefined )
			return baseElem.user_login;
	}
	else
	{
		if ( ! baseElem.user_login.HasValue )
			return '';

		user = ArrayOptFindByKey( users, AuthLoginToUserLogin( baseElem.user_login ), 'login' );
		if ( user == undefined )
			return baseElem.user_login;
	}

	str = GetObjectProperty( user, global_settings.user_primary_disp_name );
	if ( str == '' )
		return baseElem.user_login;

	return str;
}


function AuthLoginToUserLogin( authLogin )
{
	if ( ( obj = StrOptScan( authLogin, '%s\\%s' ) ) != undefined )
		userLogin = obj[1];
	else
		userLogin = authLogin;

	return StrLowerCase( userLogin );
}




function get_catalog_form_record( catalog )
{
	return catalog.Form.TopElem.Child( 0 );
}


function get_catalog_empty_parent_id( catalog )
{
	return get_catalog_form_record( catalog ).Child( 'id' ).Type == 'string' ? '' : null;
}


function get_catalog_title( catalog )
{
	if ( ( cardObjectType = ArrayOptFindByKey( card_object_types, catalog.ObjectName ) ) != undefined )
		return cardObjectType.name;

	//if ( ( vocInfo = lib_voc.get_opt_voc_info( catalog.Form.TopElem.Name ) ) != undefined )
		//return vocInfo.name;

	return catalog.Form.TopElem.Title;
}


function register_catalog_filter_constraint( catalogName, filterID )
{
	catalogConstraint = base1_config.catalog_filter_constraints.ObtainChildByKey( catalogName );
	return catalogConstraint.filter_constraints.ObtainChildByKey( filterID );
}


function has_catalog_filter_constraints( catalogName, filterID )
{
	filterConstraint = get_opt_catalog_filter_constraint( catalogName, filterID );
	if ( filterConstraint == undefined )
		return false;

	if ( ! filterConstraint.value.HasValue && filterConstraint.values == undefined )
		return false;

	return true;
}


function match_catalog_filter_constraints( catalogName, filterID, newValue )
{
	filterConstraint = get_opt_catalog_filter_constraint( catalogName, filterID );
	if ( filterConstraint == undefined )
		return true;

	if ( filterConstraint.values != undefined ) // New style
	{
		if ( ObjectType( newValue ) == 'JsArray' && true )
			return ( ArrayIntersect( newValue, filterConstraint.values ).length != 0 );
		else
			return ( filterConstraint.values.indexOf( newValue ) >= 0 );
	}
	else if ( filterConstraint.value.HasValue )
	{
		if ( ObjectType( newValue ) == 'JsArray' && true )
		{
			for ( newSubValue in newValue )
			{
				if ( ! filterConstraint.value.ByValueExists( newSubValue ) )
					return false;
			}

			return true;
		}
		else
		{
			if ( filterConstraint.value.ByValueExists( newValue ) )
				return true;

			return false;
		}
	}

	return true;
}


function check_catalog_filter_constraints( catalogName, filterID, newValue )
{
	if ( ! match_catalog_filter_constraints( catalogName, filterID, newValue ) )
		throw UserError( UiText.errors.catalog_filter_constraint_denied );
}


function adjust_catalog_filter_with_constraint( catalogName, filterID, elem )
{
	filterConstraint = base1_config.catalog_filter_constraints.GetChildByKey( catalogName ).filter_constraints.GetChildByKey( filterID );
	
	if ( filterConstraint.values != undefined ) // New style
	{
		if ( elem.IsMultiElem )
			elem.SetValues( filterConstraint.values );
		else
			elem.Value = ArrayOptFirstElem( filterConstraint.values );
	}
	else
	{
		if ( elem.IsMultiElem )
			elem.SetValues( [ArrayFirstElem( filterConstraint.value )] );
		else
			elem.Value = ArrayFirstElem( filterConstraint.value );
	}
}


function get_opt_catalog_filter_constraint( catalogName, filterID )
{
	catalogConstraint = base1_config.catalog_filter_constraints.GetOptChildByKey( catalogName );
	if ( catalogConstraint == undefined )
		return undefined;

	return catalogConstraint.filter_constraints.GetOptChildByKey( filterID );
}


function query_records_by_key( catalog, keyVal, keyName )
{
	return XQuery( 'for $elem in ' + catalog.Name + ' where $elem/' + keyName + ' = ' + XQueryLiteral( keyVal ) + ' return $elem' );
}


function query_opt_record_by_key( catalog, keyVal, keyName )
{
	return ArrayOptFirstElem( query_records_by_key( catalog, keyVal, keyName ) );
}




function adjust_catalog_order( catalog )
{
	newOrderIndex = 1;

	for ( elem in ArraySelectAll( catalog ) )
	{
		if ( elem.order_index == null )
		{
			doc = DefaultDb.OpenObjectDoc( catalog_name_to_object_name( catalog.Name ), elem.id );
			doc.TopElem.order_index = newOrderIndex;
			doc.Save();

			newOrderIndex++;
		}
		else
		{
			if ( elem.order_index >= newOrderIndex )
				newOrderIndex = elem.order_index + 1;
		}
	}
}


function get_secondary_foreign_disp_name( elem )
{
	if ( ! elem.HasValue )
		return '';

	str = '';

	for ( instance in elem.Instances )
	{
		if ( str != '' )
		{
			str += ';  ';
		}

		str += instance.ForeignDispName;
	}

	return str;
}


function object_field_desc( fieldID, objectTypeID )
{
	if ( fieldID == '' )
		return '';

	if ( objectTypeID == '' )
		return fieldID;

	objectForm = DefaultDb.GetObjectForm( objectTypeID );
	
	if ( ! objectForm.TopElem.PathExists( fieldID ) )
		return fieldID;

	elem = objectForm.TopElem.EvalPath( fieldID );

	if ( elem.Title != '' )
		return elem.Title;

	return '<' + fieldID + '>';
}


function object_change_prohibited( objectData )
{
	if ( lib_user.active_user_access.allow_all )
		return false;

	cardObjectType = ArrayOptFindByKey( card_object_types, objectData.Name );
	if ( cardObjectType == undefined )
		return false;

	if ( cardObjectType.prohibit_change )
		return true;

	if ( cardObjectType.prohibit_change_ext && objectData.eid.HasValue )
		return true;

	return false;
}


function register_object_coding( objectTypeID )
{
	RegisterAutoDoc( get_coding_doc_url( objectTypeID ), 'base1_object_coding.xmd' );
}


function get_coding_doc_url( objectTypeID )
{
	'x-local://data/coding/coding_' + objectTypeID + '.xml';
}


function obtain_new_object_code( objectTypeID )
{
	cardObjectType = GetForeignElem( card_object_types, objectTypeID );

	codingDoc = OpenDoc( get_coding_doc_url( objectTypeID ) );

	newCode = cardObjectType.coding_prefix + StrInt( codingDoc.TopElem.next_index, cardObjectType.coding_digits_num );
	codingDoc.TopElem.next_index++;

	try
	{
		codingDoc.Save();
	}
	catch ( e )
	{
		Sleep( 200 );
		codingDoc.Save();
	}

	return newCode;
}


function init_new_card_object( objectData )
{
	cardObjectType = GetForeignElem( card_object_types, objectData.Name );

	if ( cardObjectType.use_auto_coding )
		objectData.code = obtain_new_object_code( cardObjectType.id );

	for ( cardAttachmentType in card_attachment_types )
	{
		if ( cardAttachmentType.target_object_type_id == cardObjectType.id && cardAttachmentType.auto_create_new && StrBegins( cardAttachmentType.init_content_type, 'text/' ) )
		{
			attachment = objectData.attachments.AddChild();
			attachment.type_id = cardAttachmentType.id;
			attachment.content_type = cardAttachmentType.init_content_type;

			if ( attachment.is_text && cardAttachmentType.use_default_text )
			{
				attachmentTypeDoc = OpenDoc( cardAttachmentType.ObjectUrl );
				attachmentType = attachmentTypeDoc.TopElem;

				attachment.text = attachmentType.default_text;
			}
		}
	}
}


function handle_merge_objects( objectUrlsArray )
{
	docsArray = new Array();
	
	for ( objectUrl in objectUrlsArray )
	{
		doc = OpenDoc( objectUrl );
		docsArray.push( doc );

		objectName = doc.TopElem.Name;
	}

	lib_base.ask_warning_to_continue( ActiveScreen, UiText.messages.merge_selected_objects );

	destDoc = docsArray[0];
	docsArray.splice( 0, 1 );

	for ( srcDoc in docsArray )
	{
		merge_objects( destDoc.TopElem, srcDoc.TopElem );
	}

	destDoc.Save();

	replace_object_links( destDoc.TopElem.Name, destDoc.TopElem.id, ArrayExtract( docsArray, 'TopElem.id' ) );
}


function merge_objects( destElem, srcElem )
{
	destElem.AssignExtraElem( srcElem );

	if ( destElem.Name == 'person' )
	{
		if ( srcElem.org_id.HasValue && srcElem.org_id != destElem.org_id )
		{
			prevJob = destElem.prev_jobs.AddChild();
			prevJob.start_date = srcElem.creation_date;
			prevJob.org_id = srcElem.org_id;
			prevJob.position_name = srcElem.position_name;
		}
	}
}


function HandleCreateNewDependentObjectCard( objectTypeID, srcObject )
{
	doc = DefaultDb.OpenNewObjectDoc( objectTypeID );
	object = doc.TopElem;
	lib_base.init_new_card_object( object );

	elem = object.OptChild( srcObject.Name + '_id' );
	if ( elem != undefined )
		elem.Value = srcObject.id;

	object.AssignExtraElem( srcObject );
	
	if ( objectTypeID == 'event' && ! object.date.HasValue )
		object.date = CurDate;

	if ( objectTypeID == 'expense' )
	{
		vacancy = object.vacancy_id.ForeignElem;

		if ( ! object.division_id.HasValue )
			object.division_id = vacancy.division_id;

		if ( vacancy.final_candidate_id.HasValue )
		{
			object.candidate_id = vacancy.final_candidate_id;
			source = object.candidate_id.ForeignElem.source_id.OptForeignElem;
			if ( source != undefined && source.org_id.HasValue && ! object.org_id.HasValue )
				object.org_id = source.org_id;
		}
	}





	CreateDocScreen( doc );
}


function replace_object_links( objectTypeID, destID, srcIDsArray )
{
	for ( form in DefaultDb.ObjectForms )
	{
		if ( ! form_elem_has_object_type_links( form.TopElem, lib_base.object_name_to_catalog_name( objectTypeID ) ) )
			continue;

		for ( record in ArraySelectAll( DefaultDb.GetOptCatalog( lib_base.object_name_to_catalog_name( form.TopElem.Name ) ) ) )
		{
			doc = OpenDoc( record.ObjectUrl );

			if ( ! replace_elem_object_links( doc.TopElem, lib_base.object_name_to_catalog_name( objectTypeID ), destID, srcIDsArray ) )
				continue;

			doc.Save();
		}
	}
}


function form_elem_has_object_type_links( formElem, catalogName )
{
	if ( formElem.ForeignArrayExpr == catalogName )
		return true;

	for ( formSubElem in formElem )
	{	
		if ( form_elem_has_object_type_links( formSubElem, catalogName ) )
			return true;
	}

	return false;
}


function replace_elem_object_links( elem, catalogName, destID, srcIDsArray )
{
	if ( elem.FormElem.ForeignArrayExpr == catalogName )
	{
		if ( elem.HasValue && ArrayOptFind( srcIDsArray, 'This == ' + CodeLiteral( elem.Value ) ) != undefined )
		{
			elem.Value = destID;
			return true;
		}
	}

	match = false;

	for ( subElem in elem )
	{	
		if ( replace_elem_object_links( subElem, catalogName, destID, srcIDsArray ) )
			match = true;
	}

	return match;
}


function get_card_pages_form( objectTypeID )
{
	rootItem = OpenDocFromStr( '<SPXML-SCREEN></SPXML-SCREEN>' ).TopElem;

	for ( view in ArraySelect( lib_voc.get_sorted_voc( views ), 'is_card_page && card_object_type_id == ' + CodeLiteral( objectTypeID ) ) )
	{
		//if ( view.exist_req_expr != '' && ! eval( view.exist_req_expr ) )
			//continue;

		rootItem2 = rootItem;

		if ( view.exist_req_expr != '' )
		{
			rootItem2 = rootItem.AddChild( 'IF' );
			rootItem2.AddAttr( 'EXPR', view.exist_req_expr );
			
		}

		param = lib_view.build_view_param( view.id );

		page = rootItem2.AddChild( 'PAGE' );
		page.AddAttr( 'SOURCE', "Ps.view" );
		page.AddAttr( 'TITLE', ( param.view.card_page_title != '' ? param.view.card_page_title : param.view.name ) );
		
		if ( param.view.image_url != '' )
			page.AddAttr( 'IMAGE-URL', AbsoluteUrl( param.view.image_url, '//tt/' ) );
		else
			page.AddAttr( 'IMAGE-URL', DefaultDb.GetObjectForm( catalog_name_to_object_name( param.view.catalog_name ) ).ImageUrl );

		lib_view.build_screen_form_core( param, false, page );
	}
	
	return rootItem.Xml;
}


function get_field_default_col_len( formElem )
{
	if ( formElem.ExpMaxLen != null )
		return formElem.ExpMaxLen;
	else if ( formElem.Type == 'integer' )
		return 10;
	else if ( formElem.Type == 'real' )
		return 12;
	else if ( formElem.Type == 'bool' )
		return 2;
	else if ( formElem.ResultDataType == 'date' )
		return 10;
	else
		return null;
}


function ensure_doc_ever_saved( doc )
{
	if ( ! doc.NeverSaved )
		return;

	save_opt_screen_doc( doc );
}


function save_opt_screen_doc( doc )
{
	screen = doc.OptScreen;
	if ( screen != undefined )
		screen.SaveDoc();
	else
		doc.Save();
}


function SaveOptScreenObject( object )
{
	if ( LdsIsClient && object.OptScreen != undefined )
		object.OptScreen.SaveDoc();
	else
		object.Doc.Save();
}


function update_object_related_objects( object, options )
{
	if ( options == undefined )
		options = new Object;

	options.src_object = object;
	object.update_related_objects( options );
}


function update_related_object( objectUrl, srcObject, options )
{
	screen = FindOptScreenByDocUrl( objectUrl );
	if ( screen != undefined )
	{
		doc = screen.Doc;
		if ( doc.IsChanged )
			screen.SaveDoc();
	}
	else
	{
		doc = OpenDoc( objectUrl );
	}

	doc.TopElem.on_related_object_changed( srcObject, options );

	if ( screen != undefined )
	{
		screen.SaveDoc();
	}
	else
	{
		doc.Save();
	}
}


function update_dep_object( objectUrl, srcElem, action )
{
	try
	{
		objectDoc = OpenDoc( objectUrl );
	}
	catch ( e )
	{
		return;
	}

	if ( srcElem.Name == 'candidate' )
		baseObjectName = srcElem.Name;
	else
		baseObjectName = get_base_object_name( srcElem.Name );

	if ( CallObjectMethod( objectDoc.TopElem, 'handle_' + baseObjectName + '_changed', [srcElem] ) == false )
		return;

	objectDoc.Save();
}


function update_ui_dep_object( objectUrl, srcElem, action )
{
/*	screenArray = ArraySelect( AllScreens, 'This.Doc.Url == objectUrl' );
	if ( screenArray.length > 1 )
	{
		DebugMsg( 1111 );
		screenArray = ArraySelect( screenArray, 'This.Doc.Url == objectUrl' );
	}
*/

	screen = FindOptScreen( objectUrl );
	if ( screen == undefined )
		screen = FindOptScreenByDocUrl( objectUrl );
	if ( screen != undefined )
		doc = screen.Doc;
	else
		doc = OpenDoc( objectUrl );

	CallObjectMethod( doc.TopElem, 'handle_ui_' + get_base_object_name( srcElem.Name ) + '_changed', [srcElem, action] );
}


function get_base_object_name( objectName )
{
	baseObjectName = objectName;

	while ( true )
	{
		objectForm = DefaultDb.GetObjectForm( baseObjectName );
		if ( objectForm.BaseObjectName == '' )
			break;

		baseObjectName = objectForm.BaseObjectName;
	}

	return baseObjectName;
}


function field_is_hidden( elem )
{
	if ( ! elem.FormElem.AllowHide )
		return false;
	
	cardObjectType = GetOptForeignElem( card_object_types, elem.Doc.TopElem.Name );
	if ( cardObjectType == undefined )
		return false;

	return cardObjectType.hidden_fields.ChildByKeyExists( elem.Name );
}


function amount_title( title, class )
{
	if ( global_settings.use_multi_currencies.Child( class ) )
		return title;

	return title + ', ' + global_settings.default_currency_id.ForeignElem.name;
}


function amount_bk_color( class, salaryElem )
{
	if ( ! global_settings.use_multi_currencies.Child( class ) )
		return '';

	return salaryElem.ForeignElem.bk_color;
}


function MonthDayFromDate( date )
{
	if ( date == null )
		return null;

	return Month( date ) * 100 + Day( date );
}


function smart_days_diff( date1, date2 )
{
	diff = DateDiff( date1, date2 );
	if ( diff >= 0 )
	{
		isNeg = false;
	}
	else
	{
		isNeg = true;
		diff = 0 - diff;
	}

	if ( diff < 86400 )
	{
		if ( DateNewTime( date1 ) == DateNewTime( date2 ) )
			return 0;

		daysDiff = 1;
	}
	else
	{
		daysDiff = ( diff + 43200 ) / 86400;
	}

	if ( isNeg )
		return 0 - daysDiff;
	else
		return daysDiff;
}


function get_date_days_diff( date1, date2 )
{
	if ( date1 < date2 )
		return 0 - get_date_days_diff( date2, date1 );

	if ( Hour( date1 ) == undefined || Hour( date2 ) == undefined )
	{
		date1 = DateNewTime( date1 );
		date2 = DateNewTime( date2 );
	}

	diff = DateDiff( date1, date2 );
	if ( diff < 86400 )
	{
		if ( DateNewTime( date1 ) == DateNewTime( date2 ) )
			return 0;

		daysDiff = 1;
	}
	else
	{
		daysDiff = ( diff + 43200 ) / 86400;
	}

	return daysDiff;
}


function get_date_years_diff( date1, date2 )
{
	diff = Year( date1 ) - Year( date2 );
	if ( diff == 0 )

	if ( diff > 0 )
	{
		if ( Date( Year( date1 ), Month( date2 ), Day( date2 ) ) < DateNewTime( date1 ) )
			diff--;
	}
	else if ( diff < 0 )
	{
		if ( Date( Year( date2 ), Month( date1 ), Day( date1 ) ) > DateNewTime( date2 ) )
			diff++;
	}
	else
	{
		return 0;
	}
}


function get_date_year_offset( date, yearsNum )
{
	return Date( Year( date ) + yearsNum, Month( date ), Day( date ) );
}


function get_term_date_offset( date, term )
{
	switch ( term.unit_id )
	{
		case 'second':
			return DateOffset( date, term.length );

		case 'minute':
			return DateOffset( date, term.length * 60 );

		case 'hour':
			return DateOffset( date, term.length * 3600 );

		case 'd':
			return DateOffset( date, term.length * 86400 );

		case 'wd':
			return lib_calendar.get_date_wdays_offset( date, term.length );

		case 'm':
			return get_month_date_offset( date, term.length );

		case 'y':
			return Date( Year( date ) + term.length, Month( date ), Day( date ) );
	}
}


function get_term_date_neg_offset( date, term )
{
	switch ( term.unit_id )
	{
		case 'second':
			return DateOffset( date, 0 - term.length );

		case 'minute':
			return DateOffset( date, 0 - term.length * 60 );

		case 'hour':
			return DateOffset( date, 0 - term.length * 3600 );

		case 'd':
			return DateOffset( date, 0 - term.length * 86400 );

		case 'wd':
			return lib_calendar.get_date_wdays_offset( date, 0 - term.length );

		case 'm':
			return get_month_date_offset( date, 0 - term.length );

		case 'y':
			return Date( Year( date ) - term.length, Month( date ), Day( date ) );
	}
}


function get_month_date_offset( date, monthsNum )
{
	day = Day( date );
	
	if ( monthsNum >= 0 )
	{
		month = ( Month( date ) + monthsNum - 1 ) % 12 + 1;
		year = Year( date ) + monthsNum / 12;
		if ( month < Month( date ) )
			year++;
	}
	else
	{
		if ( Month( date ) > 0 - monthsNum )
		{
			month = Month( date ) + monthsNum;
			year = Year( date );
		}
		else
		{
			month = ( Month( date ) + monthsNum ) % 12 + 12;
			year = Year( date ) + monthsNum / 12;
			if ( month > Month( date ) )
				year--;
		}
	}
	
	newDate = Date( year, month, day );

	if ( day == 31 && ! IsValidDate( newDate ) )
		newDate = Date( year, month, 30 );

	if ( month == 2 && day > 28 && ! IsValidDate( newDate ) )
		newDate = Date( year, month, 28 );

	return newDate;
}


function build_yq_date( year, quarter )
{
	switch ( quarter )
	{
		case 1:
			return Date( year, 3, 31 );

		case 2:
			return Date( year, 6, 30 );

		case 3:
			return Date( year, 9, 30 );

		case 4:
			return Date( year, 12, 31 );

		default:
			throw 'Invalid quarter';
	}
}


function calc_yq_date( date )
{
	if ( date == null )
		return null;

	return build_yq_date( Year( date ), get_date_quarter( date ) );
}


function get_date_quarter( date )
{
	return ( ( Month( date ) - 1 ) / 3 ) + 1;
}


function GetQuarterStartDate( year, quarter )
{
	return Date( year, ( quarter - 1 ) * 3 + 1, 1 );
}


function GetQuarterEndDate( year, quarter )
{
	switch ( quarter )
	{
		case 1:
			return Date( year, 3, 31 );

		case 2:
			return Date( year, 6, 30 );

		case 3:
			return Date( year, 9, 30 );

		case 4:
			return Date( year, 12, 31 );
	}
}


function StrRomanInteger( value )
{
	switch ( value )
	{
		 case 1:
			return 'I';

		 case 2:
			return 'II';

		 case 3:
			return 'III';

		 case 4:
			return 'IV';
	}
}


function date_fits_range( date, minDate, maxDate )
{
	if ( date == null )
		return false;

	return date >= minDate && ( maxDate == null || date <= DateNewTime( maxDate, 23, 59, 59 ) );
}


function period_intersects_period( minDate, maxDate, minDate2, maxDate2 )
{
	/*if ( minDate != null && date_fits_range( minDate, minDate2, maxDate2 ) )
		return ;
	else if ( minDate != null )
		return date_fits_range( minDate, minDate2, maxDate2 );
	
	if ( date == null )
		return false;

	return date >= minDate && ( maxDate == null || date <= DateNewTime( maxDate, 23, 59, 59 ) );*/
}


function seconds_period_desc( seconds )
{
	if ( seconds == null )
		return '';

	hours = seconds / 3600;
	minutes = ( seconds / 60 ) % 60;
	
	str = StrInt( hours );

	//if ( minutes != 0 )
		str += ':' + StrInt( minutes, 2 );

	return str ;
}


function DateOffsetShortDescription( seconds, format )
{
	days = seconds / 86400;
	hours = ( seconds % 86400 ) / 3600;
	minutes = ( seconds % 3600 ) / 60;
	
	str = '';

	if ( days != 0 )
	{
		str += days + ' ' + UiText.titles.day__short;
		if ( format == 'd|h' )
			return str;
	}

	if ( hours != 0 )
	{
		if ( str != '' )
			str += '  ';

		str += hours + ' ' + UiText.titles.hour__short;
		if ( format == 'd|h' )
			return str;
	}

	if ( minutes != 0 && days == 0 )
	{
		if ( str != '' )
			str += '  ';

		str += minutes + ' ' + UiText.titles.minute__short + '.';
	}

	return str;
}


function DateOffsetDescription( seconds, format )
{
	days = seconds / 86400;
	hours = ( seconds % 86400 ) / 3600;
	minutes = ( seconds % 3600 ) / 60;
	
	str = '';

	if ( days != 0 )
	{
		str += days + ' ' + IntModSelector( days, base1_common.period_units.GetChildByKey( 'd' ).mod2_name );
		if ( format == 'd|h' )
			return str;
	}

	if ( format == 'd|h' )
		return StrInt( hours ) + ':' + StrInt( minutes, 2 );

	if ( hours != 0 )
	{
		if ( str != '' )
			str += '  ';

		str += hours + ' ' + UiText.titles.hour__short;
		if ( format == 'd|h' )
			return str;
	}

	if ( minutes != 0 && days == 0 )
	{
		if ( str != '' )
			str += '  ';

		str += minutes + ' ' + UiText.titles.minute__short + '.';
	}

	return str;
}


function DateOffsetFromTodayDescription( date, format )
{
	if ( format == 'wd' )
	{
		daysOffset = lib_calendar.get_date_wdays_diff( DateNewTime( date ), DateNewTime( CurDate ) );

		if ( daysOffset == 1 )
			return UiText.titles.tomorrow;
		else if ( daysOffset == -1 )
			return UiText.titles.yesterday;
		else if ( daysOffset > 0 )
			return lib_base.BuildUiParamEntry( UiText.titles.after_xxx__period, daysOffset + ' ' + IntModSelector( daysOffset, base1_common.period_units.GetChildByKey( 'wd' ).mod2_name ) );
		else if ( daysOffset < 0 )
			return lib_base.BuildUiParamEntry( UiText.titles.ago_xxx__period, (-daysOffset) + ' ' + IntModSelector( -daysOffset, base1_common.period_units.GetChildByKey( 'wd' ).mod2_name ) );
	}
	else
	{
		daysOffset = lib_base.get_date_days_diff( DateNewTime( date ), DateNewTime( CurDate ) );

		if ( daysOffset == 1 )
			return UiText.titles.tomorrow;
		else if ( daysOffset == -1 )
			return UiText.titles.yesterday;
		else if ( daysOffset > 0 )
			return lib_base.BuildUiParamEntry( UiText.titles.after_xxx__period, daysOffset + ' ' + IntModSelector( daysOffset, base1_common.period_units.GetChildByKey( 'd' ).mod2_name ) );
		else if ( daysOffset < 0 )
			return lib_base.BuildUiParamEntry( UiText.titles.ago_xxx__period, (-daysOffset) + ' ' + IntModSelector( -daysOffset, base1_common.period_units.GetChildByKey( 'd' ).mod2_name ) );
	}

	if ( format == 'd' || format == 'wd' )
		return UiText.titles.today;

	diff = DateDiff( date, CurDate );
	if ( Abs( diff ) < 60 )
		return UiText.titles.now;

	str = seconds_period_desc( Abs( diff ) );

	if ( diff > 0 )
		return lib_base.BuildUiParamEntry( UiText.titles.after_xxx__period, str );
	else
		return lib_base.BuildUiParamEntry( UiText.titles.ago_xxx__period, str );
}


function DaysNumDesc( daysNum )
{
	return StrIntZero( daysNum ) + ' ' + IntModSelector( daysNum, base1_common.period_units.GetChildByKey( 'd' ).mod2_name );
}


function WDaysNumDesc( wDaysNum )
{
	return StrIntZero( wDaysNum ) + ' ' + IntModSelector( wDaysNum, base1_common.period_units.GetChildByKey( 'wd' ).mod2_name );
}


function parse_edit_date( str )
{
	if ( str == '' )
		return null;

	str = StrReplace( str, ',', '.' );
	date = Date( str );

	if ( ! IsValidDate( date ) )
		throw UserError( UiText.errors.invalid_date );

	return date;
}


function ProcessInputDate( str )
{
	if ( str == '' )
		return null;

	str = StrReplace( str, ',', '.' );

	try
	{
		date = Date( str );
	}
	catch ( e )
	{
		throw UserError( UiText.errors.invalid_date );
	}

	if ( ! IsValidDate( date ) )
		throw UserError( UiText.errors.invalid_date );

	return date;
}


function ProcessInputTime( str, date )
{
	if ( str == '' )
		return DateNewTime( date );

	try
	{
		obj = StrScan( str, '%s:%s' );
		hour = Int( obj[0] );
		minute = Int( obj[1] );
	}
	catch ( e )
	{
		throw UserError( UiText.errors.invalid_time + '!' );
	}

	if ( hour > 23 || minute > 59 )
		throw UserError( UiText.errors.invalid_time );
					
	return DateNewTime( date, hour, minute );
}


function disp_site_url( url )
{
	dispUrl = url;

	if ( StrBegins( dispUrl, 'http://' ) )
		dispUrl = StrReplaceOne( dispUrl, 'http://', '' );

	if ( StrEnds( dispUrl, '/' ) )
		dispUrl = StrLeftRangePos( dispUrl, StrLen( dispUrl ) - 1 );

	return dispUrl;
}


function href_site_url( url )
{
	hrefUrl = url;

	if ( ! StrContains( hrefUrl, '://' ) )
		hrefUrl = 'http://' + hrefUrl;

	if ( ! StrEnds( hrefUrl, '/' ) )
		hrefUrl += '/';

	return hrefUrl;
}


function str_contains_url_host( str, host )
{
	pos = String( str ).indexOf( host );
	if ( pos < 0 )
		return false;

	if ( pos != 0 && StrIsAlphaNum( StrRangePos( str, pos - 1, pos ) ) )
	{
		return false;
	}

	return true;
}


function str_mathes_chars( str, charsArray )
{
	array = StrToCharArray( str );
	return ( ArrayOptFind( array, 'ArrayOptFind( charsArray, This ) == undefined' ) == undefined );
}


function str_contains_digits_only( str )
{
	for ( char in StrToCharArray( str ) )
	{
		if ( char < '0' || char > '9' )
			return false;
	}

	return true;
}


function IsStrictPhoneField( field )
{
	if ( field.Name == 'mobile_phone' )
		return global_settings.use_strict_mobile_phones;
	else
		return global_settings.use_strict_other_phones;
}


function GetPhoneFieldDispValue( field )
{
	if ( global_settings.use_phone_formatting )
		return lib_phone_details.FormatPhone( field );
	else
		return field;
}


function OnPhoneFieldSetValue( field, NewValue )
{
	if ( NewValue != '' )
	{
		if ( global_settings.adjust_phones )
		{
			formalPhone = lib_phone_details.GetOptFormalPhone( NewValue, {baseObject:field.OptParent} );
			if ( formalPhone == undefined )
			{
				if ( lib_base.IsStrictPhoneField( field ) )
					throw UiError( UiText.errors.invalid_phone_number );

				field.Value = NewValue;
			}
			else
			{
				field.Value = formalPhone;
			}
		}
		else
		{
			if ( lib_base.IsStrictPhoneField( field ) )
			{
				phoneObj = lib_phone_details.ParsePhone( NewValue );
				if ( phoneObj == undefined )
					throw UiError( UiText.errors.invalid_phone_number );
			}

			field.Value = NewValue;
		}
	}
	else
	{
		field.Value = NewValue;
	}

	field.Doc.SetChanged( true );
}


function build_ft_phone( phone )
{
	if ( phone == '' )
		return '';

	phoneObj = lib_phone_details.ParsePhone( phone );
	if ( phoneObj == undefined )
		return build_simple_ft_phone( phone );

	str = lib_phone_details.PhoneObjectToFormalPhone( phoneObj );
	if ( StrBegins( str, '+' ) )
		str += ' ' + StrRightRangePos( str, 1 );

	if ( phoneObj.countryCode != undefined || phoneObj.dialingPrefix != undefined )
		str += ' ' + phoneObj.mainPart;
	
	return str;
}


function build_simple_ft_phone( phone )
{
	str = phone;

	str = StrReplace( str, ' ', '' );
	str = StrReplace( str, '(', '' );
	str = StrReplace( str, ')', '' );
	str = StrReplace( str, '+', '' );
	str = StrReplace( str, '-', '' );

	str = StrReplace( str, ',', ' ' );
	str = StrReplace( str, ';', ' ' );

	return str;
}


function build_ft_email( email )
{
	if ( email == '' )
		return '';

	str = email;

	if ( ( pos = StrOptSubStrPos( email, '@' ) ) != undefined )
		str += ' ' + StrRightRangePos( str, pos );

	return str;
}


function email_matches_domain_ext( email, domain )
{
	if ( StrBegins( domain, '@' ) )
		adjDomain = StrRightRangePos( domain, 1 );
	else
		adjDomain = domain;

	if ( ! StrContains( adjDomain, '.' ) )
		return false;

	if ( ! StrEnds( email, adjDomain, true ) )
		return false;

	emailLen = StrLen( email );
	domainLen = StrLen( adjDomain );

	if ( emailLen <= domainLen )
		return false;

	delim = StrRangePos( email, ( emailLen - domainLen ) - 1, emailLen - domainLen );
	if ( delim == '@' || delim == '.' )
		return true;

	return false;
}


function email_matches_our_domain( email )
{
	for ( domain in global_settings.own_mail_domain )
	{
		if ( email_matches_domain_ext( email, domain ) )
			return true;
	}

	return false;
}


function url_host_match( url, pattern )
{
	if ( ! StrContains( pattern, '.' ) )
		return false;

	if ( ! StrEnds( url, pattern, false ) )
		return false;

	pos = StrLen( url ) - StrLen( pattern );
	if ( pos != 0 && StrIsAlphaNum( StrRangePos( url, pos - 1, pos ) ) )
		return false;

	return true;
}


function GetCoreDomain( host )
{
	if ( StrBegins( host, 'www.' ) )
		return StrRightRangePos( host, 4 );

	return host;
}


function IsSubdomain( host, baseHost )
{
	if ( host == baseHost )
		return true;

	if ( ! StrEnds( host, baseHost ) )
		return false;

	prefixLen = StrLen( host ) - StrLen( baseHost );

	if ( StrRangePos( host, prefixLen - 1, prefixLen ) != '.' )
		return false;

	return true;
}


function parse_flex_year( str )
{
	if ( str == '' )
		return null;

	try
	{
		year = Int( str );
	}
	catch ( e )
	{
		throw UserError( UiText.errors.invalid_year );
	}

	if ( year <= 20 )
		year += 2000;
	else if ( year <= 99 )
		year += 1900;
	else if ( year < 1900 || year > 2099 )
		throw UserError( UiText.errors.invalid_year );

	return year;
}


function get_person_fullname( person )
{
	if ( base1_config.is_int_version )
	{
		str = ( person.lastname != '' ? person.lastname + ', ' + person.firstname : person.firstname );
		if ( base1_config.use_person_middlename && person.middlename != '' )
			str += ' ' + person.middlename;
	}
	else
	{
		str = person.lastname + ' ' + person.firstname + ' ' + person.middlename;
	}

	return Trim( UnifySpaces( str ) );
}


function parse_strict_person_fullname( person, fullname )
{
	if ( fullname == '' )
		return;

	array = String( fullname ).split( ' ' );

	switch ( ArrayCount( array ) )
	{
		case 1:
			person.lastname = array[0];
			break;

		case 2:
			person.lastname = array[0];
			person.firstname = array[1];
			break;

		case 3:
			person.lastname = array[0];
			person.firstname = array[1];
			person.middlename = array[2];
			break;

		default:
			person.lastname = array[0];

			for ( i = 1; i < ArrayCount( array ) - 2; i++ )
				person.lastname += ' ' + array[i];

			person.firstname = array[ArrayCount( array ) - 2];
			person.middlename = array[ArrayCount( array ) - 1];
	}

}


function GetPersonAge( person )
{
	if ( person.birth_date.HasValue )
	{
		age = Year( CurDate ) - Year( person.birth_date );

		if ( Date( Year( CurDate ), Month( person.birth_date ), Day( person.birth_date ) ) > CurDate )
			age--;
	}
	else if ( person.birth_year.HasValue )
	{
		age = Year( CurDate ) - person.birth_year;
	}
	else
	{
		return null;
	}

	if ( age <= 0 )
		return null;

	return age;
}


function print_report( reportStr )
{
	tempFile = ObtainSessionTempFile( '.rtf' );
	PutUrlData( tempFile, ReportToRtf( reportStr ) );

	ShellExecute( 'open', tempFile );
}


function print_card( screen )
{
	selector = screen.FindItem( 'main_selector' );
	
	print_report( BuildFullReport( selector.MakeReport() ) );
}


function print_screen( screen )
{
	print_report( BuildFullReport( screen.MakeReport() ) );
}


function print_main_list( screen )
{
	list = screen.FindOptItemByType( 'LIST' );
	if ( list == undefined )
		list = screen.FindOptItemByType( 'GRID' );
	if ( list == undefined )
		return;

	if ( System.ClientMajorVersion >= 2 )
	{
		list = screen.FindOptItemByType( 'LIST' );
		if ( list == undefined )
			list = screen.FindOptItemByType( 'GRID' );
		if ( list == undefined )
			return;

		ui_client.ShowListInRtf( list );
		return;
	}

	print_report( BuildFullReport( list.MakeReport() ) );
}


function all_files_suffix_pattern()
{
	UiText.titles.all_files + ' (*.*)\t*.*'
}


function get_content_type_default_file_suffix( contentType )
{
	switch ( contentType )
	{
		case 'image/jpeg':
			return '.jpg';

		case 'image/gif':
			return '.gif';

		case 'image/bmp':
			return '.bmp';

		case 'image/png':
			return '.png';
	}

	return '';
}


function adjust_file_name( fileName )
{
	fileName = StrReplace( fileName, '/', '' );
	fileName = StrReplace( fileName, ':', '' );
	fileName = StrReplace( fileName, '*', '' );
	fileName = StrReplace( fileName, '?', '' );
	fileName = StrReplace( fileName, '"', '' );
	fileName = StrReplace( fileName, '<', '' );
	fileName = StrReplace( fileName, '>', '' );
	fileName = StrReplace( fileName, '|', '' );

	return fileName;
}


function handle_import_objects_from_files()
{
	files = ActiveScreen.AskFilesOpen( '', UiText.titles.xml_documents + ' (*.xml)\t*.xml\t' + lib_base.all_files_suffix_pattern );

	for ( file in files )
		import_object_from_file( file, 'data' );

	UpdateScreens( '*', '*' );
}


function import_object_from_file( srcUrl, dbName )
{
	doc = OpenDoc( srcUrl, 'ui-text=1' );
	
	if ( doc.TopElem.ChildExists( 'id' ) && doc.TopElem.id.HasValue )
		doc.Url = ObjectDocUrl( dbName, doc.TopElem.Name, doc.TopElem.id );
	else
		throw UiError( 'Document is not an object' );

	doc.Save();
}


function handle_open_doc_by_url()
{
	docUrl = select_string_value( 'URL', '' );
	ObtainDocScreen( docUrl );
}


function read_directory_files( dir, useSubDirs )
{
	destFiles = new Array;
	read_directory_files_rec_level( dir, useSubDirs, destFiles );
	return destFiles;
}


function read_directory_files_rec_level( dir, useSubDirs, destFiles )
{
	CheckCurThread();

	files = ReadDirectoryByPath( dir );
	files = ArraySort( files, 'This', '+' );

	for ( file in files )
	{
		if ( IsDirectory( file ) )
		{
			if ( useSubDirs )
				read_directory_files_rec_level( file, useSubDirs, destFiles );
		}
		else
		{
			destFiles[destFiles.length] = file;
		}
	}
}


function show_info_message( screen, text )
{
	screen.MsgBox( text, UiText.messages.info_msg_title, 'info' );
}


function show_result_message( screen, text )
{
	screen.MsgBox( text, UiText.fields.result, 'info' );
}


function show_warning_message( screen, text )
{
	screen.MsgBox( text, UiText.messages.warning_msg_title, 'warning' );
}


function show_warning_message_once( screen, text, neverShowAgain )
{
	if ( neverShowAgain == undefined )
		neverShowAgain = false;

	dlgDoc = OpenDoc( 'base1_dlg_message.xml' );
	dlgDoc.TopElem.message_type = 'warning';
	dlgDoc.TopElem.title = UiText.messages.warning_msg_title;
	dlgDoc.TopElem.text = text;
	dlgDoc.TopElem.never_show_again = neverShowAgain;
	
	ActiveScreen.ModalDlg( dlgDoc );

	return dlgDoc.TopElem.never_show_again;
}


function show_error_message( screen, text )
{
	screen.MsgBox( text, UiText.messages.error_msg_title, 'error' );
}


function ask_question( screen, text )
{
	return screen.MsgBox( text, UiText.messages.question_msg_title, 'question', 'yes,no' );
}


function ask_question_with_cancel( screen, text )
{
	return screen.MsgBox( text, UiText.messages.question_msg_title, 'question', 'yes,no,cancel' );
}


function ask_warning_to_continue( screen, text )
{
	if ( ! screen.MsgBox( text, UiText.messages.warning_msg_title, 'warning', 'yes,no' ) )
		Cancel();
}


function show_need_restart_server_warning( screen )
{
	if ( UseLds )
		show_warning_message( screen, UiText.messages.changes_require_server_restart );
	else
		show_warning_message( screen, UiText.messages.changes_require_app_restart );
}


function send_error_report( e )
{
	str = AppName + ' ' + AppVersion + ' ' + AppSubName + '\r\n';
	str += 'build: ' + StrDate( AppBuildDate, false ) + '\r\n';
	str += 'sn: ' + AppSn + '\r\n';
	str += '\r\n';

	str += e;

	url = 'mailto:esp@e-staff.ru?subject=ERROR REPORT&body=' + UrlEncode( str );
	ShellExecute( 'open', url );
}


function build_help_article_url( relPath )
{
	if ( System.IsWebClient )
	{
		return AbsoluteUrl( '/app_url/rcr/help/' + relPath, System.WebClientUrl );
	}

	return 'x-app://rcr/help/' + relPath;
}


function show_doc_source( doc )
{
	if ( doc.TopElem.Name == 'user' && ! lib_user.active_user_access.allow_all )
		throw UiError( UiText.errors.permission_denied );
		
	tempUrl = ObtainSessionTempFile( '.txt' );
	doc.SaveToUrl( tempUrl, 'inline-ext-objects=0;tabs=1;' );

	ShellExecute( 'open', tempUrl );
}


function CheckAttachmentFileRestrictions( fileUrl )
{
	if ( global_settings.max_attachment_size.HasValue )
	{
		if ( UrlFileSize( fileUrl ) > global_settings.max_attachment_size )
			throw UiError( UiText.errors.max_attachment_size_exceeded );
	}

	if ( global_settings.prohibited_attachment_suffixes.ChildByValueExists( UrlPathSuffix( fileUrl ) ) )
		throw UiError( UiText.errors.attachment_suffix_prohibited );
}


function execute_card_attachment( attachment, screen, fileInfo )
{
	if ( fileInfo == undefined )
		fileInfo = attachment;

	if ( System.IsWebClient )
	{
		ui_client.HandleOpenCardAttachmentFile( attachment, fileInfo );

		/*if ( attachment.is_binary )
			ExecuteFieldContent( 'open', fileInfo.data, attachment.content_type, fileInfo.file_name );
		else if ( attachment.is_plain_text )
			ExecuteFieldContent( 'open', fileInfo.plain_text, attachment.content_type, '' );
		else
			ExecuteFieldContent( 'open', fileInfo.text, attachment.content_type, '' );*/

		return;
	}

	check_desktop_client();

	if ( false )
	{
		tempDir = ObtainSessionTempFile();
		//CreateDirectory( tempDir );
		tempFilePath = UrlAppendPath( tempDir, attachment.file_name );

		attachment.data.SaveToFile( tempFilePath );

		try
		{
			ShellExecute( 'open', tempFilePath );
		}
		catch ( e )
		{
			lib_base.show_error( screen, UiText.errors.unable_to_open_file );
		}
	}
	else
	{
		editor = OpenNewDoc( 'base1_card_attachment_editor.xmd' ).TopElem;
		editor.Init( attachment, fileInfo );

		screen.AddExternalEditor( editor );
	}
}


function print_card_attachment( attachment, fileInfo )
{
	if ( ! attachment.is_text && ! attachment.is_plain_text )
		return;

	if ( fileInfo == undefined )
		fileInfo = attachment;

	attachmentTypeDoc = OpenDoc( attachment.type_id.ForeignObjectUrl );
	attachmentType = attachmentTypeDoc.TopElem;

	if ( attachmentType.use_msword_template && attachmentType.msword_template.data.HasValue )
	{
		tempUrl = ObtainSessionTempFile( '.doc' );
		attachmentType.msword_template.data.SaveToFile( tempUrl );

		WordExecute( 'open', ( attachment.is_text ? attachment.text : attachment.plain_text ), attachment.content_type, tempUrl );
	}
	else
	{
		//WordExecute( 'open', ( attachment.is_text ? attachment.text : attachment.plain_text ), attachment.content_type );
	
		editor = OpenNewDoc( 'base1_card_attachment_editor.xmd' ).TopElem;
		editor.Init( attachment, fileInfo );
	}
}


function HandleSaveCardAttachment( attachment, fileInfo )
{
	if ( System.IsWebClient )
	{
		ui_client.HandleSaveCardAttachmentFile( attachment, fileInfo );
		return;
	}

	if ( fileInfo == undefined )
		fileInfo = attachment;

	fileNameSuffix = UrlPathSuffix( fileInfo.file_name );
	fileUrl = ActiveScreen.AskFileSave( fileInfo.file_name, '(*' + fileNameSuffix + ')\t*' + fileNameSuffix + '\t' + lib_base.all_files_suffix_pattern );
	
	fileInfo.data.SaveToFile( fileUrl );
}


function CheckAllowedAttcFileSuffix( fileUrl )
{
	suffix = UrlPathSuffix( fileUrl );
	if ( IsAttcFileSuffixProhibited( suffix ) )
		throw UiError( 'File type is not allowed' );
}


function IsAttcFileSuffixProhibited( suffix )
{
	array = ['.exe', '.com', '.dll', '.bat', '.js'];
	return ( array.indexOf( StrLowerCase( suffix ) ) >= 0 );
}


function resave_object( objectUrl )
{
	doc = OpenDoc( objectUrl );
	doc.WriteDocInfo = false;
	doc.Save();
}


function handle_copy_objects_emails( objectUrlsArray, list )
{
	idArray = new Array;
	objectTypeID = undefined;

	for ( objectUrls in objectUrlsArray )
	{
		if ( objectTypeID == undefined )
			objectTypeID = ObjectNameFromUrl( objectUrls );
		
		idArray.push( ObjectIDFromUrl( objectUrls ) );
	}
	
	str = '';

	queryStr = 'for $elem in ' + lib_base.object_name_to_catalog_name( objectTypeID ) + ' where MatchSome( $elem/id, ( ' + ArrayMerge( idArray, 'XQueryLiteral( This )', ',' ) + ' ) ) return $elem/Fields( "id","email" )';
	array = XQuery( queryStr )
	
	for	( record in array )
	{
		if ( ! record.ChildExists( 'email' ) )
			throw UserError( UiText.errors.sel_records_have_no_emails );

		if ( record.email == '' )
			continue;

		if ( str != '' )
			str += '; ';

		str += record.email;
	}

	SetClipboard( str );
}


function handle_set_objects_field( objectUrlsArray )
{
	dlgDoc = OpenDoc( 'base1_dlg_set_object_field.xml' );
	dlgDoc.TopElem.object_type_id = ObjectNameFromUrl( ArrayFirstElem( objectUrlsArray ) );
	dlgDoc.TopElem.init();
	
	ActiveScreen.ModalDlg( dlgDoc );

	if ( ! dlgDoc.TopElem.field_id.HasValue || ! dlgDoc.TopElem.field_value.HasValue )
		return;

	if ( dlgDoc.TopElem.field_id == 'user_id' && lib_user.active_user_access.prohibit_change_object_user )
		throw UiError( UiText.errors.change_user_prohibited );

	if ( dlgDoc.TopElem.field_id == 'group_id' && lib_user.active_user_access.prohibit_change_object_group )
		throw UiError( UiText.errors.change_group_prohibited );

	if ( dlgDoc.TopElem.object_type_id == 'vacancy' && dlgDoc.TopElem.field_id == 'state_id' && lib_user.active_user_access.prohibit_change_vacancy_state )
		throw UiError( UiText.errors.permission_denied );

	for ( objectUrl in objectUrlsArray )
	{
		doc = OpenDoc( objectUrl );

		elem = GetObjectProperty( doc.TopElem, dlgDoc.TopElem.field_id );
		
		if ( dlgDoc.TopElem.field_form_elem.IsMultiple )
		{
			if ( ! dlgDoc.TopElem.append )
				elem.Clear();

			for ( instance in dlgDoc.TopElem.field_value.Instances )
				elem.ObtainByValue( instance );
		}
		else
		{
			elem.Value = dlgDoc.TopElem.field_value;
		}

		if ( lib_voc.get_opt_voc_info( dlgDoc.TopElem.field_form_elem.ForeignArrayExpr ) != undefined )
			lib_voc.update_idata_by_voc( elem );

		doc.Save();
	}
}


function run_list_object_action( list, actionID )
{
	if ( list.Name == 'ListVacancyEntries' || list.Name == 'ListVacancyAdEntries' || list.Name == 'ListAdEntries' || list.Name == 'ListTaskBoard' )
		throw UiError( UiText.errors.action_not_available_for_this_list );

	action = GetForeignElem( object_actions, actionID );

	if ( action.code.HasValue )
	{
		if ( ! list.HasSel )
			return;

		with ( list.SelRow.Env.ListElem )
		{
			eval( action.code );
		}

		return;
	}

	if ( action.object_type_id.HasValue )
	{
		objectIDsArray = ArrayExtract( ArraySelect( list.SelRows, 'Env.ListElem.Name == ' + CodeLiteral( action.object_type_id ) ), 'Env.ListElem.id' );
		if ( ArrayCount( objectIDsArray ) == 0 )
			return;

		lib = eval( action.lib_name );

		if ( action.mass_method_name.HasValue )
		{
			CallObjectMethod( lib, action.mass_method_name, [objectIDsArray, list] );
		}
		else
		{
			for ( objectID in objectIDsArray )
			{
				CallObjectMethod( lib, action.method_name, [objectID] );
			}
		}
	}
	else
	{
		objectUrlsArray = ArrayExtract( list.SelRows, 'Env.ListElem.PrimaryObjectUrl' );
		if ( ArrayCount( objectUrlsArray ) == 0 )
			return;

		lib = eval( action.lib_name );

		if ( action.mass_method_name.HasValue )
		{
			CallObjectMethod( lib, action.mass_method_name, [objectUrlsArray, list] );
		}
		else
		{
			for ( objectUrl in objectUrlsArray )
			{
				CallObjectMethod( lib, action.method_name, [objectUrl] );
			}
		}
	}

	if ( ! action.show_in_context_menu && ! action.is_passive )
		list.Screen.Update();
}


function run_stat_grid_object_action( grid, actionID )
{
	action = GetForeignElem( object_actions, actionID );

	if ( action.code.HasValue )
	{
		if ( ! grid.HasSel )
			return;

		with ( grid.SelRow.Env.ListElem )
		{
			eval( action.code );
		}

		return;
	}

	if ( action.object_type_id.HasValue )
	{
		objectIDsArray = ArrayExtract( ArraySelect( grid.SelRows, 'Env._item.record_ref.Object.Name == ' + CodeLiteral( action.object_type_id ) ), 'Env._item.record_ref.Object.id' );
		if ( ArrayCount( objectIDsArray ) == 0 )
			return;

		lib = eval( action.lib_name );

		if ( action.mass_method_name.HasValue )
		{
			CallObjectMethod( lib, action.mass_method_name, [objectIDsArray, grid] );
		}
		else
		{
			for ( objectID in objectIDsArray )
			{
				CallObjectMethod( lib, action.method_name, [objectID] );
			}
		}
	}
	else
	{
		objectUrlsArray = ArrayExtract( grid.SelRows, 'Env.ListElem.PrimaryObjectUrl' );
		if ( ArrayCount( objectUrlsArray ) == 0 )
			return;

		lib = eval( action.lib_name );

		if ( action.mass_method_name.HasValue )
		{
			CallObjectMethod( lib, action.mass_method_name, [objectUrlsArray, grid] );
		}
		else
		{
			for ( objectUrl in objectUrlsArray )
			{
				CallObjectMethod( lib, action.method_name, [objectUrl] );
			}
		}
	}

	if ( ! action.show_in_context_menu && ! action.is_passive )
		grid.Screen.Update();
}


function run_object_action( object, actionID )
{
	action = GetForeignElem( object_actions, actionID );

	lib = eval( action.lib_name );

	CallObjectMethod( lib, action.method_name, [object] );

	if ( ! action.is_passive )
		object.Screen.Update();
}


function RunCardCustomAction( customAction, object )
{
	lib = OpenCodeLib( customAction.lib_url );
	CallObjectMethod( lib, customAction.method_name, [object] );
}



function update_object_attachments_on_before_save( object )
{
	object.multi_attachment_type_id.SetValues( ArraySelectDistinct( ArrayExtract( object.attachments, 'type_id' ) ) );
}


function MergeObjectAttachments( object )
{
	for ( attachment in ArraySelectAll( object.attachments ) )
	{
		if ( ! attachment.type_id.ForeignElem.allow_multiple_files || ! attachment.is_binary )
			continue;

		prevAttachment = object.attachments.GetOptChildByKey( attachment.type_id, 'type_id' );
		if ( prevAttachment === attachment )
			continue;

		if ( prevAttachment.files.ChildNum == 0 )
		{
			file = prevAttachment.files.AddChild();
			file.AssignElem( prevAttachment );

			prevAttachment.file_name.Clear();
			prevAttachment.data.Clear();
		}

		file = prevAttachment.files.AddChild();
		file.AssignElem( attachment );
		attachment.Delete();
	}
}




function check_desktop_client()
{
	if ( System.IsWebClient )
		throw UiError( UiText.errors.desktop_client_required );
}


function check_plugin_proposed( pluginID )
{
	if ( local_settings.plugins.Child( pluginID + '_plugin_proposed' ) )
		return;

	pluginLib = eval( 'lib_' + pluginID );

	if ( ! CallObjectMethod( pluginLib, 'is_' + pluginID + '_installed' ) )
		return;

	if ( CallObjectMethod( pluginLib, 'is_' + pluginID + '_plugin_registered' ) )
		return;

	if ( lib_base.ask_question( ActiveScreen, StrReplace( UiText.messages.Child( 'should_register_xxx_' + pluginID + '_plugin' ), '%s', AppName ) ) )
		CallObjectMethod( pluginLib, 'register_' + pluginID + '_plugin' );
		
	local_settings.plugins.Child( pluginID + '_plugin_proposed' ).Value = true;
	local_settings.Doc.Save();
}


function run_code_as_admin( codeStr )
{
	if ( base1_config.is_setup )
	{
		eval( codeStr );
		return;
	}

	appDir = AppDirectoryPath();
	//appPath = FilePath( FilePath( appDir, 'Uninstall' ), 'SpXml.exe' );
	appPath = FilePath( appDir, 'SpXml.exe' );

	tempFileUrl = ObtainSessionTempFile( '.xjs' );
	PutUrlData( tempFileUrl, codeStr );
	
	if ( System.CombVersion >= 600 )
		verb = "runas";
	else
		verb = "open";

	ShellExecute( verb, appPath, '-entry=none -eval="EvalCodeUrl( ' + CodeLiteral( tempFileUrl ) + ' )"' );
}


function run_lib_method_as_admin( libUrl, methodName, argsArray )
{
	codeStr = 'OpenCodeLib( ' + CodeLiteral( libUrl ) + ' ).' + methodName + '(';

	count = 0;

	for ( arg in argsArray )
	{
		if ( count != 0 )
			codeStr += ', ';

		codeStr += CodeLiteral( arg );
		count++;
	}

	codeStr += ')';

	run_code_as_admin( codeStr );
}


function is_explorer_default_browser()
{
	str = GetSysRegStrValue( 'HKEY_CLASSES_ROOT\\http\\shell\\open\\command', '' );
	//alert( str );
	return StrContains( str, 'iexplore.exe', true );
}


function is_explorer_plugin_registered()
{
	regKey = 'HKEY_AUTO\\Software\\Microsoft\\Internet Explorer\\Extensions\\{C30C6D7C-68A6-42B5-97B1-80AB1E4DC1AF}\\';

	if ( System.IsX64 )
	{
		if ( ! lib_gate.is_datex_gate_x64_ole_class_registered( get_ie_plugin_ole_class_name(), get_ie_plugin_ole_clsid() ) )
			return false;

		if ( ! SysRegKeyExists( regKey, {Prefer64View:true} ) )
			return false;
	}

	if ( ! lib_gate.is_datex_gate_ole_class_registered( get_ie_plugin_ole_class_name(), get_ie_plugin_ole_clsid() ) )
		return false;

	if ( ! SysRegKeyExists( regKey ) )
		return false;

	return true;
}


function register_explorer_plugin()
{
	if ( System.IsX64 )
	{
		if ( ! lib_gate.is_datex_gate_x64_ole_class_registered( get_ie_plugin_ole_class_name(), get_ie_plugin_ole_clsid() ) )
			lib_gate.register_datex_gate_x64_ole_class( get_ie_plugin_ole_class_name(), get_ie_plugin_ole_clsid() );

		//if ( ! lib_gate.is_datex_gate_x64_registered() ) 
			//lib_gate.register_datex_gate_x64();

		register_explorer_plugin_core( 'HKEY_AUTO\\Software\\', {Prefer64View:true} );
	}

	if ( ! lib_gate.is_datex_gate_ole_class_registered( get_ie_plugin_ole_class_name(), get_ie_plugin_ole_clsid() ) )
		lib_gate.register_datex_gate_ole_class( get_ie_plugin_ole_class_name(), get_ie_plugin_ole_clsid() );

	register_explorer_plugin_core( 'HKEY_AUTO\\Software\\', {Prefer32View:true} );
	
}


function register_explorer_plugin_core( baseKey, sysRegOptions )
{
	appDir = base1_config.app_setup_dir;

	regKey = baseKey + 'Microsoft\\Internet Explorer\\Extensions\\{C30C6D7C-68A6-42B5-97B1-80AB1E4DC1AF}\\';

	SetSysRegStrValue( regKey, 'ButtonText', UiText.actions.import_to_estaff, sysRegOptions );
	SetSysRegStrValue( regKey, 'HotIcon', FilePath( FilePath( appDir, 'base_pict' ), 'estaff.ico' ), sysRegOptions );
	SetSysRegStrValue( regKey, 'Icon', FilePath( FilePath( appDir, 'base_pict' ), 'estaff.ico' ), sysRegOptions );
	SetSysRegStrValue( regKey, 'CLSID', '{1FBA04EE-3024-11d2-8F1F-0000F87ABD16}', sysRegOptions );
	SetSysRegStrValue( regKey, 'ClsidExtension', '{2960C44B-1DB7-4c24-9E9C-882D7B81B962}', sysRegOptions );
	SetSysRegStrValue( regKey, 'Default Visible', 'Yes', sysRegOptions );
	SetSysRegStrValue( regKey, 'ExtAppID', 'EStaff', sysRegOptions );
	SetSysRegStrValue( regKey, 'ToolTip', 'Импортировать выделенный фрагмент страницы в качестве резюме в EStaff', sysRegOptions );


	//regKey = 'HKEY_LOCAL_MACHINE\\Software\\' + 'Microsoft\\Windows\\CurrentVersion\\Explorer\\Browser Helper Objects\\{2960C44B-1DB7-4c24-9E9C-882D7B81B962}\\';

	//SetSysRegStrValue( regKey, '', AppName, sysRegOptions );
	//SetSysRegStrValue( regKey, 'NoExplorer', '1', sysRegOptions );
}


function unregister_explorer_plugin()
{
	if ( SysRegKeyExists( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Internet Explorer\\Extensions\\{C30C6D7C-68A6-42B5-97B1-80AB1E4DC1AF}', {Prefer32View:true} ) )
		RemoveSysRegKey( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Internet Explorer\\Extensions\\{C30C6D7C-68A6-42B5-97B1-80AB1E4DC1AF}', {Prefer32View:true} );
	
	try
	{
		if ( SysRegKeyExists( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Internet Explorer\\Extensions\\{C30C6D7C-68A6-42B5-97B1-80AB1E4DC1AF}', {Prefer64View:true} ) )
			RemoveSysRegKey( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Internet Explorer\\Extensions\\{C30C6D7C-68A6-42B5-97B1-80AB1E4DC1AF}', {Prefer64View:true} );
	}
	catch ( e )
	{
	}

	if ( SysRegKeyExists( 'HKEY_CURRENT_USER\\Software\\Microsoft\\Internet Explorer\\Extensions\\{C30C6D7C-68A6-42B5-97B1-80AB1E4DC1AF}' ) )
		RemoveSysRegKey( 'HKEY_CURRENT_USER\\Software\\Microsoft\\Internet Explorer\\Extensions\\{C30C6D7C-68A6-42B5-97B1-80AB1E4DC1AF}' );
}


function get_ie_plugin_ole_class_name()
{
	return lib_gate.get_base_class_name() + '.IeExtension';
}


function get_ie_plugin_ole_clsid()
{
	return lib_gate.get_gate_config().explorer_plugin.clsid;
}


function register_url_handler( installForAll )
{
	schema = StrLowerCase( StrReplaceOne( AppID, '_Demo', '' ) );
	sysRegOptions = {Prefer64View:true};

	if ( installForAll )
		regKey = 'HKEY_CLASSES_ROOT\\' + schema;
	else
		regKey = 'HKEY_CURRENT_USER\\Software\\Classes\\' + schema;

	SetSysRegStrValue( regKey, '', 'URL:' + schema + ' Protocol', sysRegOptions );
	SetSysRegStrValue( regKey, 'URL Protocol', '', sysRegOptions );

	SetSysRegStrValue( regKey + '\\DefaultIcon', '', FilePath( FilePath( base1_config.app_setup_dir, 'base_pict' ), 'estaff.ico' ), sysRegOptions );
	//SetSysRegStrValue( regKey + '\\DefaultIcon', '', FilePath( AppDirectoryPath(), 'SpXml.exe' ) + ',1', sysRegOptions );

	commandStr = '"' + FilePath( base1_config.app_setup_dir, 'SpXml.exe' ) + '" -uri="%1"';
	SetSysRegStrValue( regKey + '\\shell\\open\\command', '', commandStr, sysRegOptions );
}


function open_app_custom_url( url )
{
	appID = StrLowerCase( StrReplaceOne( AppID, '_Demo', '' ) );

	if ( UrlSchema( url ) != appID )
		throw UserError( "Unknown url schema: " + UrlSchema( url ) );
	
	if ( ( obj = StrOptScan( UrlPath( url ), '/db-obj/data/%s/%s.xml' ) ) == undefined )
		throw UserError( "Invalid url path: " + UrlPath( url ) );

	objectUrl = ObjectDocUrl( 'data', obj[0], obj[1] );
	ObtainDocScreen( objectUrl );
}


function extract_plain_text_form_pdf_file( fileUrl )
{
	textFileUrl = ObtainTempFile( '.txt' );

	useNewConv = true;//( AppCharset == 'utf-8' );

	if ( useNewConv )
	{
		exeFilePath = FilePath( FilePath( FilePath( AppDirectoryPath(), 'misc' ), 'pdfconv' ), 'gswin32c.exe' );
		if ( ! FilePathExists( exeFilePath ) )	
			useNewConv = false;
	}

	if ( useNewConv )
	{
		argStr = '-sDEVICE=txtwrite -o "' + UrlToFilePath( textFileUrl ) + '" "' + UrlToFilePath( fileUrl ) + '"';
	}
	else
	{
		exeFilePath = FilePath( FilePath( FilePath( AppDirectoryPath(), 'misc' ), 'pdfconv' ), 'pdfconv.exe' );
		argStr = '-layout "' + UrlToFilePath( fileUrl ) + '" "' + UrlToFilePath( textFileUrl ) + '"';
	}

	retVal = ProcessExecute( exeFilePath, argStr, 'wait=1;hidden=1;' );
	if ( retVal != 0 )
	{
		//PutUrlData( 'zzzzz.txt', '-layout "' + UrlToFilePath( fileUrl ) + '" "' + UrlToFilePath( textFileUrl ) + '"' );
		CopyFile( UrlToFilePath( fileUrl ), UrlToFilePath( 'x-local://Logs/bad_pdf.pdf' ) );
		//throw 'PDF error ' + retVal;
		return '';
	}

	if ( useNewConv )
	{
		DebugMsg( textFileUrl );
		textStr = DecodeCharset( LoadUrlData( textFileUrl ), 'utf-8' );
	}
	else
	{
		if ( AppCharset == 'utf-8' )
			textStr = LoadUrlText( textFileUrl );
		else
			textStr = LoadUrlData( textFileUrl );
	}
	
	//DeleteFile( textFileUrl );
	return textStr;
}


function run_copy_object_id( objectUrl )
{
	objectID = ObjectIDFromUrl( objectUrl );
	SetClipboard( objectID );
}


function run_copy_object_hex_id( objectUrl )
{
	objectID = ObjectIDFromUrl( objectUrl );
	SetClipboard( '0x' + StrHexInt( objectID ) );
}


function run_copy_record_xml( objectUrl )
{
	catalog = DefaultDb.GetOptCatalog( lib_base.object_name_to_catalog_name( ObjectNameFromUrl( objectUrl ) ) );
	
	objectID = ObjectIDFromUrl( objectUrl );

	record = GetOptForeignElem( catalog, objectID );

	SetClipboard( record.Xml );
}


function run_restore_object_by_catalog_record( objectUrl )
{
	try
	{
		doc = OpenDoc( objectUrl );
		throw UserError( 'Object is valid' );
	}
	catch ( e )
	{
	}

	catalog = DefaultDb.GetOptCatalog( lib_base.object_name_to_catalog_name( ObjectNameFromUrl( objectUrl ) ) );
	
	objectID = ObjectIDFromUrl( objectUrl );

	record = GetOptForeignElem( catalog, objectID );

	doc = OpenNewDoc( DefaultDb.GetObjectForm( ObjectNameFromUrl( objectUrl ) ).Url, 'separate=1' );
	doc.Url = objectUrl;
	doc.TopElem.AssignElem( record );

	if ( doc.TopElem.Name == 'candidate' )
	{
		attachment = doc.TopElem.attachments.AddChild();
		attachment.type_id = 'resume';
	}

	//doc.IsSeparated = false;
	alert( doc.TopElem.Xml );
	doc.Save();
}


function is_sql_storage()
{
	return DefaultDb.UseSqlStorage;
}


function use_ft_v2()
{
	if ( System.IsWebClient )
		return false;

	return DefaultDb.UseFtV2;
}


function handle_send_card_attachments_by_email( object, attcArray )
{
	message = new MailMessage();
}


function handle_send_sms( phone )
{
	phoneStr = lib_phone_details.PhoneToGlobalPhone( phone );

	dlgDoc = OpenDoc( 'base1_dlg_sms_message.xml' );
	dlgDoc.TopElem.dest_phone = phoneStr;

	ActiveScreen.ModalDlg( dlgDoc );

	message = lib_sms.create_sms_message();
	message.dest_phone = dlgDoc.TopElem.dest_phone;
	message.text = dlgDoc.TopElem.text;
	
	lib_sms.send_sms_message( message );
}


function RegisterSmsSending( template, baseObject )
{
	if ( template != undefined && template.register_event && template.event_type_id.HasValue && baseObject != undefined && baseObject.Name == 'candidate' )
	{
		baseObject.register_mail_message_event( template, baseObject.main_vacancy_id );
	}
}


function adjust_account_ssl_attr_by_server_address( account, protocolID )
{
	if ( protocolID == 'pop' && StrEnds( account.server_address, ':995' ) )
	{
		account.use_ssl_port = true;
		account.use_ssl = false;
	}
	else if ( protocolID == 'imap' && StrEnds( account.server_address, ':993' ) )
	{
		account.use_ssl_port = true;
		account.use_ssl = false;
	}
}


function handle_check_account( account )
{
	if ( System.IsWebClient )
	{
		if ( account.OptDoc != undefined && account.Doc.IsChanged )
			account.Doc.Save();
		
		respInfo = CallServerMethod( 'lib_base', 'CheckAccountCoreSrv', [account.id] );

		msgStr = UiText.messages.checking_successful;
		if ( respInfo != undefined && respInfo.GetOptProperty( 'extraInfoStr' ) != undefined )
		{
			msgStr += '.\r\n\r\n' + respInfo.extraInfoStr;
			lib_base.show_info_message( ActiveScreen, msgStr );
		}

		lib_base.show_info_message( ActiveScreen, msgStr );
		return;
	}

	if ( account.type_id == 'imod_site' )
		return lib_imod.HandleCheckAccount( account );
	else if ( account.type_id == 'recruit_provider' )
		return lib_recruit_provider.HandleCheckAccount( account );
	else if ( account.type_id == 'google' )
	{
		respObj = lib_google.HandleCheckAccount( account );

		msgStr = UiText.messages.checking_successful;
		if ( respObj != undefined )
		{
			msgStr += '.\r\n\r\n';
			msgStr += UiText.objects.user + ':\r\n';
			msgStr += respObj.fullname + '\r\n';
		
			if ( respObj.HasProperty( 'email' ) )
				msgStr += respObj.email + '\r\n';
		}

		lib_base.show_info_message( ActiveScreen, msgStr );
	}
	else
	{
		open_imap_client_session_for_account( account );
		lib_base.show_info_message( ActiveScreen, UiText.messages.checking_successful );
	}
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function CheckAccountCoreSrv( accountID )
{
	account = GetForeignElem( external_accounts, accountID );

	if ( account.type_id == 'imod_site' )
		return;// lib_imod.HandleCheckAccount( account );
	else if ( account.type_id == 'recruit_provider' )
		return;// lib_recruit_provider.HandleCheckAccount( account );
	else if ( account.type_id == 'google' )
	{
		respObj = lib_google.HandleCheckAccount( account );
		respInfo = new Object;

		if ( respObj != undefined )
		{
			respInfo.extraInfoStr = UiText.objects.user + ':\r\n';
			respInfo.extraInfoStr += respObj.fullname + '\r\n';
		
			if ( respObj.HasProperty( 'email' ) )
				extraInfoStr += respObj.email + '\r\n';
		}

		return respInfo;
	}
	else
	{
		open_imap_client_session_for_account( account );
		return undefined;
	}
}


function open_imap_client_session_for_account( account )
{
	if ( ! account.login.HasValue )
		throw UiError( UiText.errors.login_not_specified );

	if ( ! account.password_ed.HasValue )
		throw UiError( UiText.errors.password_not_specified );

	imapClient = new ImapClient;

	if ( account.use_ssl_port )
		imapClient.UseTLSPort = true;
	else if ( account.use_ssl )
		imapClient.UseTLS = true;
	
	imapClient.OpenSession( account.server_address );
	imapClient.Authenticate( account.login, StrStdDecrypt( account.password_ed ) );
	return imapClient;
}


function CheckFieldReference( fieldVal, catalog, baseObject )
{
	if ( IsValidFieldReference( fieldVal, catalog ) )
		return;

	baseObjectDesc = baseObject.Form.Title + ': ' + baseObject.PrimaryDispName;
	foreignObjectDesc = DefaultDb.GetObjectForm( catalog.ObjectName ).Title + ': 0x' + StrHexInt( fieldVal );

	throw UserError( BuildUiParamEntry( UiText.errors.invalid_object_xxx_reference_to_xxx, baseObjectDesc, foreignObjectDesc ) );
}


function IsValidFieldReference( fieldVal, catalog )
{
	if ( fieldVal == null || fieldVal == '' )
		return true;

	if ( GetOptForeignElem( catalog, fieldVal ) != undefined )
		return true;

	return false;
}


function CalcElemSelectorWidthMeasure( field, defaultLen, maxLen )
{
	return CalcElemSelectorWidthMeasureCore( field.ForeignArray, field.FormElem.Title, defaultLen, maxLen );
}


function CalcElemSelectorWidthMeasureCore( foreignArray, title, defaultLen, maxLen )
{
	minWidth = CalcTextWidth( title + ':' ) + 4;
	maxWidth = maxLen * GetZrSize();

	array = ArraySelect( foreignArray, '! ChildExists( \'is_active\' ) || is_active' );

	maxElemWidth = ArrayOptMax( ArrayExtract( array, 'CalcTextWidth( PrimaryDispName )' ) );
	if ( maxElemWidth != undefined )
		selectorWidth = maxElemWidth + ( System.IsWebClient ? 26 : 24 );
	else
		selectorWidth = defaultLen * GetZrSize();

	width = selectorWidth;
	width = Min( width, maxWidth );
	width = Max( width, minWidth );

	return width + 'px';
}


function CalcTextWidth( str )
{
	if ( LdsIsClient )
		return CalcTextScreenWidth( str );

	return ( StrCharCount( str ) * 63 ) / 10; // !!! Qucik workaraund
}


function GetZrSize()
{
	if ( LdsIsClient )
		return ActiveScreen.ZrSize;

	return 6;
}


function IsCardInfoCollapsed( object )
{
	if ( object.Name != 'candidate' )
		return false;

	cci = local_settings.collapsed_card_info_object_types.GetOptChildByKey( object.Name );
	if ( cci == undefined )
		return true;

	return cci.is_collapsed;
}


function SetCardInfoCollapsed( object, isCollapsed )
{
	if ( object.Name != 'candidate' )
		return false;

	cci = local_settings.collapsed_card_info_object_types.ObtainChildByKey( object.Name );
	cci.is_collapsed = isCollapsed;
	local_settings.Doc.Save();
}


function GetCardInfoHeightMeasure( object )
{
	if ( IsCardInfoCollapsed( object ) )
		return '3zr';
	else
		return '14zrc';
}


function InternalToIsoLangID( langID )
{
	if ( langID == 'ua' )
		return 'uk';
	else
		return langID;
}


function OnVocElemSelectorElemSelected( selectorItem, source, elemID )
{
	if ( source.IsMultiElem )
	{
		if ( IsKeyPressed( 17 ) )
		{
			newValue = ArraySelectAll( source );
			newValue.ObtainByValue( elemID );
		}
		else
		{
			newValue = [elemID];
		}

		selectorItem.ExecCheckValueAction( newValue );
		source.SetValues( newValue );
	}
	else
	{
		newValue = elemID;
		selectorItem.ExecCheckValueAction( newValue );
		source.Value = newValue;
	}

	lib_voc.update_idata_by_voc( source );
	selectorItem.ExecUpdateAction();

	if ( source.OptDoc != undefined )
		source.Doc.SetChanged( true );

	if ( selectorItem.IsPassive )
		selectorItem.FindSubItemByType( 'LABEL' ).UpdateText();
	else
		selectorItem.Screen.Update();
}


function OnVocElemSelectorClear( selectorItem, source )
{
	if ( source.IsMultiElem )
		newValue = [];
	else
		newValue = ( source.Type == 'string' ? '' : null );

	selectorItem.ExecCheckValueAction( newValue );

	lib_voc.handle_clear_voc_elem( source );
	selectorItem.ExecUpdateAction();

	if ( selectorItem.IsPassive )
		selectorItem.FindSubItemByType( 'LABEL' ).UpdateText();
	else
		selectorItem.Screen.Update();
}







function OnAppFastStart() // Legacy
{
	OnAppThinClientStart();
}


function OnAppThinClientStart()
{
	if ( CurRestrictedZoneID != undefined )
	{
		OnAppThinClientStartRestricted();
		return;
	}

	coreInfo = CallServerMethod( 'lib_base', 'GetAppFastStartInfo' )

	if ( AppModuleUsed( 'rcr' ) )
	{
		app2_config.app_features.AssignElem( coreInfo.app_features );
		app_license.AssignElem( coreInfo.app_license );
		base1_config.voc_sections.AssignElem( coreInfo.voc_sections );
		base1_config.use_security_admin_role = coreInfo.use_security_admin_role;
	}

	vocs.AssignElem( coreInfo.vocs );

	if ( AppModuleUsed( 'rcr' ) )
	{
		//fields_usage.AssignElem( coreInfo.fields_usage );
		base1_config.field_usage_fragments.AssignElem( coreInfo.field_usage_fragments );
		rcr_common.std_recruit_providers.AssignElem( coreInfo.std_recruit_providers );// Remove later

		FetchDoc( '//base1/base1_view_global_settings.xml' ).TopElem.AssignElem( coreInfo.view_global_settings );


		MergeScreenForm( '//base2/base2_access_role.xms', '//rcr/rcr_fields_access_role.xms', 'AccessFieldsAnchor' );
	}

	lib_user.init_active_user();

	//for ( fragment in coreInfo.csd_form_fragments )
		//lib_csd.register_csd_data_form( fragment.base_form_url, fragment.csd_form_url );

	for ( fragment in coreInfo.csd_screen_form_fragments )
	{
		MergeScreenForm( fragment.base_screen_form_url, fragment.csd_screen_form_url, fragment.anchor_name );
	}
	
	if ( AppModuleUsed( 'rcr' ) )
	{
		lib_user.set_catalog_constraints();
		lib_calendar.set_catalog_constraints();
		lib_recruit.set_catalog_constraints();

		lib_imod.Init();
	}
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function GetAppFastStartInfo()
{
	coreInfo = new Object;

	for ( vocInfo in vocs )
	{
		vocParam = global_settings.voc_params.GetOptChildByKey( vocInfo.id );
		if ( vocParam != undefined )
		{
			vocInfo.selector_type = vocParam.selector_type;
			vocInfo.auto_order = vocParam.auto_order;
		}
	}

	if ( AppModuleUsed( 'rcr' ) )
	{
		coreInfo.app_features = app2_config.app_features;
		coreInfo.app_license = app_license;
		coreInfo.voc_sections = base1_config.voc_sections;
		coreInfo.use_security_admin_role = base1_config.use_security_admin_role;
	}

	coreInfo.csd_form_fragments = base1_config.csd_form_fragments;
	coreInfo.csd_screen_form_fragments = base1_config.csd_screen_form_fragments;

	coreInfo.vocs = vocs;

	if ( AppModuleUsed( 'rcr' ) )
	{
		//coreInfo.fields_usage = fields_usage;
		coreInfo.field_usage_fragments = base1_config.field_usage_fragments;
		coreInfo.std_recruit_providers = rcr_common.std_recruit_providers;

		coreInfo.view_global_settings = FetchDoc( '//base1/base1_view_global_settings.xml' ).TopElem;
	}

	return coreInfo;
}


function OnAppThinClientStartRestricted()
{
	coreInfo = CallServerMethod( 'lib_base', 'GetAppFastStartInfoRestricted' )

	vocs.AssignElem( coreInfo.vocs );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
"META:ALLOW-IN-RESTRICTED-ZONE:1";
function GetAppFastStartInfoRestricted()
{
	coreInfo = new Object;

	for ( vocInfo in vocs )
	{
		vocParam = global_settings.voc_params.GetOptChildByKey( vocInfo.id );
		if ( vocParam != undefined )
		{
			vocInfo.selector_type = vocParam.selector_type;
			vocInfo.auto_order = vocParam.auto_order;
		}
	}

	if ( AppModuleUsed( 'rcr' ) )
	{
		coreInfo.app_features = app2_config.app_features;
		coreInfo.app_license = app_license;
		coreInfo.voc_sections = base1_config.voc_sections;
		coreInfo.use_security_admin_role = base1_config.use_security_admin_role;
	}

	coreInfo.vocs = vocs;

	return coreInfo;
}


function GetTimeZoneDesc( timeZone )
{
	if ( timeZone == null )
		return '';

	return 'UTC' + ( timeZone >= 0 ? '+' : '' ) + StrSignedInt( timeZone, 2 );
}


function GetDayMinuteDesc( dayMinute )
{
	if ( dayMinute == null )
		return '';

	return StrInt( dayMinute / 60 ) + ':' + StrInt( dayMinute % 60, 2 );
}


function DayMinuteToTimeStrRus( dayMinute )
{
	if ( dayMinute == null )
		return '';

	return StrInt( dayMinute / 60 ) + ':' + StrInt( dayMinute % 60, 2 );
}


function ResolveFullObjectReference( object )
{
	if ( object.OptDoc != undefined )
		return object;

	return OpenDoc( object.ObjectUrl ).TopElem;
}


function IsSubUrlPathOrSelf( urlPath, baseUrlPath )
{
	if ( ! StrBegins( urlPath, baseUrlPath ) )
		return false;

	if ( StrLen( urlPath ) == StrLen( baseUrlPath ) )
		return true;
	
	if ( StrEnds( baseUrlPath, '/' ) )
	{
		if ( StrRangePos( urlPath, StrLen( baseUrlPath ) - 1, StrLen( baseUrlPath ) ) == '/' )
			return true;
	}
	else
	{
		if ( StrRangePos( urlPath, StrLen( baseUrlPath ), StrLen( baseUrlPath ) + 1 ) == '/' )
			return true;
	}

	return false;
}


function GuessImageContentTypeFromData( data )
{
	if ( StrRangePos( data, 1, 4 ) == 'PNG' )
		return 'image/png';

	return '';
}


function GetDaemonStateDesc( daemonState )
{
	switch ( daemonState )
	{
		case 0:
			return UiText.titles.stopped__off;

		case 1:
			return UiText.titles.running__on;

		case 2:
			return UiText.titles.starting;

		case 3:
			return UiText.titles.stopping;
	}

	return '';
}


function Abs( val )
{
	return ( val >= 0 ? val : 0 - val );
}


function BuildPasswordHash( password )
{
	if ( System.IsWebClient )
		return CallServerMethod( 'lib_base', 'BuildPasswordHashCore', [password] );
	else
		return PasswordHash( password );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function BuildPasswordHashCore( password )
{
	return PasswordHash( password );
}

