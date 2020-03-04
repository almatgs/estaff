function register_voc( srcVocInfo )
{
	vocInfo = vocs.AddChild();
	vocInfo.AssignElem( srcVocInfo );

	if ( vocInfo.object_name == '' )
	{
		vocInfo.object_name = lib_base.catalog_name_to_opt_object_name( vocInfo.id );
		if ( vocInfo.object_name == '' )
			vocInfo.object_name = 'elem';
	}

	//if ( vocInfo.object_form_url == '' && vocInfo.object_screen_form_url == '' )
		//vocInfo.object_screen_form_url = '/base1_voc_object.xms';

	if ( vocInfo.object_form_url == '' )
	{
		if ( srcVocInfo.OptDoc != undefined )
			stdPrefix = module_prefix_from_url( srcVocInfo.Doc.Url ) + '_';
		else
			stdPrefix = 'base1_';

		vocInfo.object_form_url = AbsoluteUrl( stdPrefix + vocInfo.object_name + '.xmd' );
		
		formStr = LoadUrlData( 'base1_voc_object_SAMPLE.xmd' );
		formStr = StrReplace( formStr, '__OBJECT_NAME__', vocInfo.object_name );
		formStr = StrReplace( formStr, '__IS_HIER__', ( vocInfo.is_hier ? '1' : '0' ) );
		formStr = StrReplace( formStr, '__PARENT_ID_SPEC__', ( vocInfo.is_hier ? '<parent_id TYPE=\"__VOC_KEY_TYPE__\" FOREIGN-ARRAY=\"' + srcVocInfo.id + '\"/>' : '' ) );
		formStr = StrReplace( formStr, '__VOC_KEY_TYPE__', vocInfo.key_type );
		formStr = StrReplace( formStr, '__FULL_NAME_SPEC__', ( vocInfo.use_full_name ? '<full_name TYPE=\"string"/>' : '' ) );

		objectForm = RegisterFormFromStr( vocInfo.object_form_url, formStr );

		if ( false && LdsIsClient)
		{
			vocInfo.object_screen_form_url = ReplaceUrlPathSuffix(vocInfo.object_form_url, '.xmd', '.xms');
			RegisterScreenFormFromStr(vocInfo.object_screen_form_url, LoadUrlData('base1_voc_object.xms'));
		}
		else
		{
			vocInfo.object_screen_form_url = AbsoluteUrl('base1_voc_object.xms');
		}
	}
	else
	{
		vocInfo.object_form_url = AbsoluteUrl( vocInfo.object_form_url );

		objectForm = FetchForm( vocInfo.object_form_url );
		if ( vocInfo.is_hier && ! objectForm.IsHier )
			throw vocInfo.object_form_url + ' form must have HIER attribute';

		if ( lib_base.object_name_to_catalog_name( objectForm.TopElem.Name ) != vocInfo.id )
			throw UserError( 'Name of top element of form ' + vocInfo.object_form_url + ' does not match vocabulary id' );

		if ( ! vocInfo.object_screen_form_url.HasValue )
			vocInfo.object_screen_form_url = ReplaceUrlPathSuffix( vocInfo.object_form_url, '.xmd', '.xms' );
	}

	if ( ! vocInfo.auto_order.HasValue )
	{
		if ( ! objectForm.TopElem.ChildExists( 'order_index' ) )
			objectForm.TopElem.AddChild( 'order_index', 'integer' );
	}
	
	if ( ! objectForm.TopElem.ChildExists( 'was_customized' ) )
	{
		subElem = objectForm.TopElem.AddChild( 'was_customized', 'bool' );
		subElem.NullFalse = true;
	}

	if ( ! objectForm.TopElem.ChildExists( 'voc_info' ) )
		objectForm.TopElem.Inherit( FetchForm( 'base1_voc_object_1.xmd' ).EvalPath( 'voc_object_base' ) );

	if ( vocInfo.key_numeric_base == null )
		vocInfo.key_numeric_base = ( vocInfo.key_type == 'integer' ? 1001 : 1 );

	if ( LdsIsClient )
	{
		try
		{
			vocParam = global_settings.voc_params.GetOptChildByKey( vocInfo.id );
			if ( vocParam != undefined )
			{
				vocInfo.selector_type = vocParam.selector_type;
				vocInfo.auto_order = vocParam.auto_order;
			}
		}
		catch ( e )
		{
		}
	}
	
	//DebugMsg( vocInfo.object_form_url );
	get_voc_db( vocInfo ).RegisterObjectType( vocInfo.object_form_url );
}


function module_prefix_from_url( url )
{
	if ( UrlSchema( url ) != 'x-app' )
		return 'base1';

	return StrScan( UrlPath( url ), '/%s_%*s' )[0];
}


function get_voc_info( voc )
{
	return get_voc_info_by_id( voc.Name );
}


function get_voc_info_by_id( vocID )
{
	vocInfo = GetOptForeignElem( vocs, vocID );
	if ( vocInfo == undefined )
		throw vocID + ' vocabulary is not registered';

	return vocInfo;
}


function get_opt_voc_info( vocID )
{
	return GetOptForeignElem( vocs, vocID );
}


function get_voc_db( vocInfo )
{
	if ( vocInfo.db_name.HasValue )
		return FetchDb( vocInfo.db_name );
	else
		return DefaultDb;
}


function get_voc_by_id( vocID )
{
	return DefaultDb.GetOptCatalog( vocID );
}


function get_sorted_voc( voc )
{
	array = ArraySelect( voc, '! ChildExists( \'is_active\' ) || is_active' );

	vocInfo = get_voc_info( voc );

	useGroups = false;

	switch ( vocInfo.id ) // !!! Quick solution
	{
		case 'mail_templates':
		case 'sms_templates':
			useGroups = true;
			break;
	}

	if ( lib_user.active_user_info.main_group_id.HasValue )
	{
		if ( useGroups )
			array = ArraySelect( array, '! group_id.HasValue || group_id == lib_user.active_user_info.main_group_id' );
		else if ( FetchForm( vocInfo.object_form_url ).TopElem.ChildExists( 'target_group_id' ) )
			array = ArraySelect( array, '! target_group_id.HasValue || target_group_id.ByValueExists( ' + CodeLiteral( lib_user.active_user_info.main_group_id ) + ' )' );
	}
	
	if ( vocInfo.auto_order.HasValue )
		return ArraySort( array, 'name', '+' );
	else
		return ArraySort( array, 'order_index', '+' );
}


function init_voc_std_data( voc, stdElemsArray )
{
	vocInfo = get_voc_info( voc );

	if ( ! vocInfo.is_optional_std_elems || ArrayCount( voc ) == 0 )
	{
		register_voc_std_array( voc, vocInfo, stdElemsArray, ( vocInfo.key_type == 'string' ? '' : null ) );
	}
}


function init_voc_std_elem( voc, stdElem )
{
	vocInfo = get_voc_info( voc );
	register_voc_std_elem( voc, vocInfo, stdElem, undefined, undefined );
}


function register_voc_std_array( voc, vocInfo, stdElemsArray, parentID )
{
	for ( stdElem in stdElemsArray )
		register_voc_std_elem( voc, vocInfo, stdElem, stdElemsArray, parentID );
}


function register_voc_std_elem( voc, vocInfo, stdElem, stdElemsArray, parentID )
{
	if ( ! UseLds && ! vocInfo.is_optional_std_elems )
	{
		if ( vocInfo.registeredStdElems == undefined )
			vocInfo.registeredStdElems = new Array;

		vocInfo.registeredStdElems.push( stdElem );

		if ( vocInfo.key_type == 'integer' )
			vocInfo.registered_std_elem_int_id.ObtainByValue( stdElem.id );
		else
			vocInfo.registered_std_elem_id.ObtainByValue( stdElem.id );
	}
	
	if ( vocInfo.key_synonym != '' )
		stdElem.Child( vocInfo.key_synonym ).AssignElem( stdElem.id );

	/*if ( stdElem.ChildExists( 'is_site' ) && stdElem.name == '' )
	{
		alert( stdElem.id );
		stdElem.name = stdElem.id;
	}*/

	elem = ArrayOptFindByKey( voc, stdElem.id, 'id' );
	if ( elem != undefined )
	{
		/*if ( vocInfo.id == 'mail_templates' && elem.id == 'vacancy_close' )
		{
			PutUrlData( 'z1.xml', elem.Xml );
			PutUrlData( 'z2.xml', stdElem.Xml );
		}*/

		if ( ! need_update_voc_elem_from_std_elem( vocInfo, elem, stdElem ) )
		{
			register_voc_std_elem_rec_children( voc, vocInfo, stdElem, stdElemsArray );
			return;
		}

		doc = get_voc_db( vocInfo ).OpenObjectDoc( vocInfo.object_name, elem.id );
	}
	else
	{
		doc = get_voc_db( vocInfo ).OpenNewObjectDoc( vocInfo.object_name, stdElem.id );
	}

	elem = doc.TopElem;
	
	if ( ! elem.was_customized )
	{
		if ( vocInfo.is_hier && parentID != undefined )
			elem.parent_id = parentID;

		if ( vocInfo.auto_order == '' && elem.ChildExists( 'order_index' ) && elem.order_index == null )
		{
			if ( stdElem.OptParent != undefined )
			{
				if ( stdElem.ChildIndex == 0 )
				{
					elem.order_index = 0;
				}
				else
				{
					prevStdElem = stdElem.Parent[stdElem.ChildIndex - 1];
					prevElem = ArrayOptFindByKey( voc, prevStdElem.id, 'id' );
					if ( prevElem != undefined && prevElem.order_index.HasValue )
						elem.order_index = prevElem.order_index + 1;
					else
						elem.order_index = obtain_next_voc_elem_order_index( voc );
				}
			}
			else
			{
				elem.order_index = obtain_next_voc_elem_order_index( voc );
			}
		}
	}
	else
	{
		EnforceVocElemStdCompliance( vocInfo, elem, stdElem );
	}

	assign_voc_std_elem( vocInfo, elem, stdElem, ( elem.name == '' ) );

	elem.is_std = true;
	doc.Save();
	//DebugMsg( doc.TopElem.Xml );

	register_voc_std_elem_rec_children( voc, vocInfo, stdElem, stdElemsArray );
}


function register_voc_std_elem_rec_children( voc, vocInfo, stdElem, stdElemsArray )
{
	if ( vocInfo.is_hier && stdElemsArray != undefined && stdElem.ChildExists( stdElemsArray.Name ) )
	{
		register_voc_std_array( voc, vocInfo, stdElem.Child( stdElemsArray.Name ), stdElem.id );
	}
}


function assign_voc_std_elem( vocInfo, elem, stdElem, isNew )
{
	var		stdSubElem;

	for ( subElem in ArraySelectAll( elem ) )
	{
		if ( ! isNew && elem.was_customized )
			continue;

		if ( subElem.IsMultiple )
			subElem.Delete();
	}

	for ( stdSubElem in stdElem )
	{
		if ( stdSubElem.Name == 'order_index' )
			continue;

		if ( stdSubElem.Name == 'items' && stdElem.Name == 'item' )
			continue;

		if ( IsVocElemFieldForcedToStd( vocInfo, stdElem, stdSubElem.Name ) )
		{
			if ( elem.ChildExists( stdSubElem.Name ) && ! stdSubElem.IsMultiple )
			{
				elem.Child( stdSubElem.Name ).AssignElem( stdSubElem );
			}
			continue;
		}

		if ( ! isNew && elem.was_customized )
			continue;

		if ( stdSubElem.IsMultiple )
		{
			GetObjectProperty( elem, stdSubElem.Name ).Add().AssignElem( stdSubElem );
		}
		else if ( elem.ChildExists( stdSubElem.Name ) && ( isNew || ! elem.was_customized || ( ! elem.Child( stdSubElem.Name ).HasValue && elem.Child( stdSubElem.Name ).ChildNum == 0 ) || ! vocInfo.std_field_editable( elem, stdSubElem.Name ) ) )
		{
			elem.Child( stdSubElem.Name ).AssignElem( stdSubElem );
		}
	}
}


function need_update_voc_elem_from_std_elem( vocInfo, elem, stdElem )
{
	var		newElem;

	if ( elem.was_customized )
	{
		if ( VocElemHasStdComplianceProblems( vocInfo, elem, stdElem ) )
		{
			//DebugMsg( '!!' + elem.id );
			return true;
		}

		for ( field in stdElem )
		{
			if ( IsVocElemFieldForcedToStd( vocInfo, stdElem, field.Name ) )
			{
				if ( ! elem.Child( field.Name ).EqualToElem( stdElem.Child( field.Name ) ) )
					return true;
			}
		}

		return false;
	}

	newElem = elem.Clone();

	for ( field in newElem )
	{
		if ( IsVocElemFieldSafelyChangeable( vocInfo, newElem, field.Name ) && stdElem.ChildExists( field.Name ) )
			field.AssignElem( stdElem.Child( field.Name ) );
	}
	
	if ( vocInfo.id == 'card_object_types' )
		newElem.name = stdElem.name;

	if ( newElem.EqualToElem( stdElem ) )
		return false;

	//DebugMsg( newElem.Xml + '\n\n' + stdElem.Xml );
	return true;
}


function IsVocElemFieldSafelyChangeable( vocInfo, elem, fieldName )
{
	switch ( fieldName )
	{
		case 'is_std':
		case 'order_index':
		case 'is_active':
			return true;
	}

	if ( elem.FormElem.Child( fieldName ).GetBoolAttr( 'exclude-from-std-data' ) )
		return true;

	return false;
}


function IsVocElemFieldForcedToStd( vocInfo, elem, fieldName )
{
	if ( vocInfo.id == 'stats' && elem.is_v2 )
	{
		switch ( fieldName )
		{
			case 'fields':
				return true;
		}
	}

	return false;
}


function VocElemHasStdComplianceProblems( vocInfo, elem, stdElem )
{
	if ( elem.ChildExists( 'is_active' ) && ! elem.is_active )
		return false;

	if ( vocInfo.id == 'event_types' )
		return lib_event.EventTypeHasStdComplianceProblems( elem, stdElem );

	return false;
}


function EnforceVocElemStdCompliance( vocInfo, elem, stdElem )
{
	if ( elem.ChildExists( 'is_active' ) && ! elem.is_active )
		return false;

	if ( vocInfo.id == 'event_types' )
		return lib_event.EnforceEventTypeStdCompliance( elem, stdElem );

	return false;
}


function voc_elem_equal_std_elem( vocInfo, elem, stdElem )
{
	var		newElem;

	newElem = elem.Clone();

	if ( newElem.ChildExists( 'is_std' ) && stdElem.ChildExists( 'is_std' ) )
		newElem.is_std = stdElem.is_std;

	if ( newElem.ChildExists( 'order_index' ) && stdElem.ChildExists( 'order_index' ) )
		newElem.order_index = stdElem.order_index;

	if ( newElem.ChildExists( 'is_active' ) && stdElem.ChildExists( 'is_active' ) )
		newElem.is_active = stdElem.is_active;

	if ( vocInfo.id == 'card_object_types' )
		newElem.name = stdElem.name;

	if ( newElem.EqualToElem( stdElem ) )
		return true;

	//DebugMsg( newElem.Xml );
	//DebugMsg( stdElem.Xml );
	//DebugMsg( newElem.Xml + '\n\n' + stdElem.Xml );

	//newElem.EqualToElem( stdElem );

	return false;
}


function clean_up_voc_std_elems( vocInfo )
{
	if ( vocInfo.is_optional_std_elems )
		return;

	if ( vocInfo.primary_voc_id.HasValue )
		return;

	if ( ! vocInfo.registered_std_elem_id.HasValue && ! vocInfo.registered_std_elem_int_id.HasValue && vocInfo.id != 'save_triggers' )
		return;

	voc = eval( vocInfo.id );

	for ( elem in ArraySelectAll( voc ) )
	{
		if ( ! elem.is_std )
			continue;

		if ( elem.was_customized )
			continue;

		if ( vocInfo.key_type == 'integer' )
			match = vocInfo.registered_std_elem_int_id.ByValueExists( elem.id );
		else
			match = vocInfo.registered_std_elem_id.ByValueExists( elem.id );

		if ( ! match )
		{
			//alert( elem.ObjectUrl );
			DeleteDoc( elem.ObjectUrl, true );
		}
	}
}


function obtain_next_voc_elem_id( voc )
{
	vocInfo = get_voc_info( voc );

	if ( vocInfo.use_random_key )
	{
		if ( vocInfo.key_type == 'string' )
			return StrHexInt( Random( 0, 1152921504606846975 ), 16 );
		else
			return Random( 0, 1152921504606846975 );
	}

	numericBase = vocInfo.key_numeric_base;
	
	while ( true )
	{
		if ( vocInfo.id == 'custom_vocs' )
			key = vocInfo.object_name + '_' + numericBase + '_entries';
		else if ( vocInfo.key_type == 'string' )
			key = vocInfo.object_name + '_' + numericBase;
		else
			key = numericBase;

		if ( ArrayOptFindByKey( voc, key ) == undefined )
			break;

		numericBase++;
	}

	return key;
}


function obtain_next_voc_elem_order_index( voc )
{
	if ( ArrayCount( voc ) == 0 )
		return 1;

	maxElem = ArrayMax( voc, 'order_index' );
	if ( maxElem.order_index == null )
		return 1;

	return maxElem.order_index + 1;
}


function voc_elem_edit_before_save_action( screen )
{
	elem = screen.Doc.TopElem;
	if ( screen.Doc.IsChanged )
		elem.was_customized = true;

	if ( screen.Doc.NeverSaved && elem.voc_info.key_synonym != '' )
	{
		screen.Doc.ObjectID = elem.Child( elem.voc_info.key_synonym );
		elem.id = screen.Doc.ObjectID;
	}

	if ( ! elem.id.HasValue )
		throw UiError( UiText.errors.voc_elem_id_not_specified );

	if ( ! elem.name.HasValue )
		throw UiError( UiText.errors.name_not_specified );

	if ( screen.Doc.NeverSaved )
	{
		voc = eval( elem.voc_info.id );

		if ( ArrayOptFindByKey( voc, elem.id ) != undefined )
			throw UserError( StrReplace( UiText.errors.voc_elem_id_xxx_already_used, '%s', elem.id ) );
	}
}


function voc_elem_edit_save_action()
{
	UpdateScreens( '*', '*view*' );
}


function all_voc_elems_filter_desc()
{
	return base1_config.empty_filter_str
}


function foreign_voc_title( elem, usage )
{
	try
	{
		usage;
	}
	catch ( e )
	{
		usage = '';
	}

	if ( elem.IsMultiElem )
	{
		if ( ! elem.HasValue )
			return ( usage == 'filter' ? all_voc_elems_filter_desc : '' );

		return ArrayMerge( elem, 'elem_foreign_voc_title( This, usage )', ', ' );
	}
	else
	{
		return elem_foreign_voc_title( elem, usage );
	}
}


function elem_foreign_voc_title( elem, usage )
{
	if ( ! elem.HasValue )
		return ( usage == 'filter' ? all_voc_elems_filter_desc : '' );

	foreignElem = elem.OptForeignElem;

	if ( foreignElem != undefined )
	{
		if ( get_voc_info( elem.ForeignArray ).is_hier )
		{
			//return foreignElem.ext_name;
			return foreignElem.ExternalDispName;
		}
		else
		{
			return foreignElem.name;
		}
	}

	title = '[' + UiText.titles.elem_deleted + '] ' + elem;

	if ( elem.ChildExists( 'sd' ) )
	{
		title = title + ', ' + elem.sd.name;
	}

	return title;
}


function update_idata_by_voc( elem )
{
	if ( elem.OptParent == undefined )
		return;

	if ( ! elem.Parent.FormElem.ChildExists( 'idata_' + elem.Name ) )
		return;

	idataElem = GetObjectProperty( elem.Parent, 'idata_' + elem.Name );
	idataElem.DeleteAll();

	for ( instance in elem.Instances )
	{
		if ( ! instance.HasValue )
			continue;

		for ( implicitValue in voc_implicit_chain( instance ) )
			idataElem.ObtainByValue( implicitValue );
	}
}


function voc_implicit_chain( id )
{
	array = new Array;

	try
	{
		elem = id.ForeignElem;
	}
	catch ( e )
	{
		return array;
	}

	while ( true )
	{
		if ( array.length >= 16 )
			break;

		array[array.length] = elem.id.Value;

		if ( ! elem.ChildExists( 'parent_id' ) || ! elem.parent_id.HasValue )
			break;

		try
		{
			elem = elem.parent_id.ForeignElem;
		}
		catch ( e )
		{
			break;
		}
	}

	return array;
}


function voc_desc_implicit_chain( id )
{
	chain = voc_implicit_chain( id );
	count = ArrayCount( chain )

	descChain = new Array( count );

	for ( i = 0; i < count; i++ )
		descChain[i] = chain[( count - i ) - 1];

	return descChain;
}


function handle_select_voc_elem( source, defaultFilter )
{
	dlg = OpenDoc( 'base1_dlg_voc_elem_select.xml' );
	dlg.TopElem.voc_id = source.ForeignArray.Name;

	if ( defaultFilter != undefined )
		dlg.TopElem.view_filter_ref = defaultFilter;

	if ( source.IsMultiElem )
	{
		dlg.TopElem.multi_select = true;

		for ( elemID in source )
			dlg.TopElem.elems.AddChild().elem_id = elemID;
	}
	else
	{
		dlg.TopElem.elem_id = source;
	}

	ActiveScreen.ModalDlg( dlg );
	
	if ( source.IsMultiElem )
	{
		source.DeleteAll();
		
		for ( elem in dlg.TopElem.elems )
		{
			destElem = source.Add();

			destElem.Value = elem.elem_id;

			if ( destElem.ChildExists( 'sd' ) )
				destElem.sd.AssignElem( source.ForeignElem );
		}
	}
	else
	{
		if ( source.Type == 'integer' )
			newValue = Int( dlg.TopElem.elem_id );
		else
			newValue = dlg.TopElem.elem_id;

		if ( source.Name == 'parent_id' && source.OptDoc != undefined && source.Parent.ChildExists( 'id' ) )
		{
			if ( source.Parent.id == newValue )
				throw UserError( UiText.errors.hier_loop_detected );

			if ( lib_base.is_catalog_hier_child( source.ForeignArray, newValue, source.Parent.id ) )
				throw UserError( UiText.errors.hier_loop_detected );
		}

		source.Value = dlg.TopElem.elem_id;

		if ( source.ChildExists( 'sd' ) )
			source.sd.AssignElem( source.ForeignElem );
	}

	update_idata_by_voc( source );

	if ( source.OptDoc != undefined )
		source.Doc.SetChanged( true );
}


function check_voc_not_empty( voc )
{
	if ( ArrayCount( get_sorted_voc( voc ) ) == 0 )
	{
		//throw UiError( UiText.errors.voc_is_empty + ': "' + get_voc_info( voc ).name + '"' );
		lib_base.show_error_message( ActiveScreen, UiText.errors.voc_is_empty + ': "' + get_voc_info( voc ).name + '"' );
		Cancel();
	}
}


function select_voc_elem( voc, defaultFilter )
{
	dlg = OpenDoc( 'base1_dlg_voc_elem_select.xml' );
	dlg.TopElem.voc_id = voc.Name;
	
	if ( defaultFilter != undefined )
		dlg.TopElem.view_filter_ref = defaultFilter;

	ActiveScreen.ModalDlg( dlg );
	return dlg.TopElem.elem_id;
}


function select_voc_elems( voc )
{
	dlg = OpenDoc( 'base1_dlg_voc_elem_select.xml' );
	dlg.TopElem.voc_id = voc.Name;
	dlg.TopElem.multi_select = true;
	
	ActiveScreen.ModalDlg( dlg );
	return ArrayExtract( dlg.TopElem.elems, 'elem_id' );
}



function handle_clear_voc_elem( elem )
{
	if ( elem.IsMultiElem )
	{
		if ( ArrayCount( elem ) == 0 )
			return;
		
		elem.DeleteAll();
	}
	else
	{
		if ( elem == null )
			return;
		
		elem.Clear();
	}

	update_idata_by_voc( elem );

	if ( elem.OptDoc != undefined )
		elem.Doc.SetChanged( true );
}



function adjust_voc_order( voc, autoOrder )
{
	vocInfo = get_voc_info( voc );

	newOrderIndex = 1;

	if ( autoOrder != '' )
		array = ArraySort( voc, autoOrder, '+' );
	else
		array = ArraySelect( voc, true );

	for ( elem in array )
	{
		if ( elem.order_index == null )
		{
			doc = get_voc_db( vocInfo ).OpenObjectDoc( vocInfo.object_name, elem.id );
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


"META:ALLOW-CALL-FROM-CLIENT:1";
function GetRegisteredStdElem( vocID, elemID )
{
	vocInfo = lib_voc.get_voc_info_by_id( vocID );
	if ( vocInfo.registeredStdElems == undefined )
		return undefined;

	return ArrayOptFindByKey( vocInfo.registeredStdElems, elemID, 'id' );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function ResetVocElemToStd( vocID, elemID )
{
	vocInfo = lib_voc.get_voc_info_by_id( vocID );

	stdElem = undefined;
	if ( vocInfo.registeredStdElems != undefined )
		stdElem = ArrayOptFindByKey( vocInfo.registeredStdElems, elemID, 'id' );
	
	doc = get_voc_db( vocInfo ).OpenObjectDoc( vocInfo.object_name, elemID );
	elem = doc.TopElem;
	elem.was_customized = false;

	if ( stdElem != undefined )
	{
		if ( elem.ChildExists( 'is_active' ) )		
			prevIsActive = RValue( elem.is_active );

		assign_voc_std_elem( vocInfo, elem, stdElem, false );

		if ( elem.ChildExists( 'is_active' ) )		
			elem.is_active = prevIsActive;

		elem.is_std = true;
		needRestart = false;
	}
	else
	{
		if ( doc.TopElem.Name == 'mail_template' )
			doc.TopElem.subject += ' -';
		
		needRestart = true;
	}

	doc.Save();

	if ( ! needRestart && vocID == 'event_types' )
	{
		for ( objectTypeID in elem.target_object_type_id )
		{
			if ( objectTypeID == 'candidate' )
				lib_event.update_object_states_by_event_types( objectTypeID );
		}
	}

	return needRestart;
}


function CalcVocElemSelectorWidthMeasure( field, defaultLen, maxLen )
{
	voc = field.ForeignArray;
	vocInfo = lib_voc.get_voc_info( voc );

	return CalcVocElemSelectorWidthMeasureCore( voc, vocInfo, field.FormElem.Title, defaultLen, maxLen );
}


function CalcVocElemSelectorWidthMeasureCore( voc, vocInfo, title, defaultLen, maxLen )
{
	minWidth = CalcTextScreenWidth( title + ':' ) + 4;
	if ( System.IsWebClient )
		minWidth += 2;

	maxWidth = maxLen * ActiveScreen.ZrSize;

	if ( vocInfo.selectorWidth == null )
	{
		array = ArraySelect( voc, '! ChildExists( \'is_active\' ) || is_active' );

		if ( false && vocInfo.is_hier )
		{
			maxElemWidth = ArrayOptMax( ArrayExtract( ArraySelect( array, '! This.parent_id.HasValue' ), 'CalcTextScreenWidth( PrimaryDispName )' ) );
			if ( maxElemWidth != undefined )
			{
				vocInfo.selectorWidth = maxElemWidth + 24;

				maxElemWidth = ArrayOptMax( ArrayExtract( ArraySelect( array, 'This.parent_id.HasValue' ), 'CalcTextScreenWidth( PrimaryDispName )' ) );
				if ( maxElemWidth != undefined )
					vocInfo.selectorWidth += maxElemWidth + 20;
			}
			else
			{
				vocInfo.selectorWidth = defaultLen * ActiveScreen.ZrSize;
			}
		}
		else
		{
			maxElemWidth = ArrayOptMax( ArrayExtract( array, 'CalcTextScreenWidth( PrimaryDispName )' ) );
			if ( maxElemWidth != undefined )
				vocInfo.selectorWidth = maxElemWidth + ( System.IsWebClient ? 26 : 24 );
			else
				vocInfo.selectorWidth = defaultLen * ActiveScreen.ZrSize;
		}
	}

	width = vocInfo.selectorWidth;
	width = Min( width, maxWidth );
	width = Max( width, minWidth );

	return width + 'px';
}