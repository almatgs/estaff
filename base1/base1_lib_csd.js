function register_csd_form( baseFormUrl, csdFormUrl )
{
	register_csd_data_form( baseFormUrl, csdFormUrl );
	register_csd_screen_form( baseFormUrl, csdFormUrl );
}


function register_csd_data_form( baseFormUrl, csdFormUrl )
{
	baseForm = FetchForm( baseFormUrl );

	csdForm = FetchForm( csdFormUrl );
	baseForm.TopElem.Inherit( csdForm.TopElem );

	has_csd_fields = true;

	if ( ! UseLds )
	{
		fragment = new Object;
		fragment.base_form_url = baseFormUrl;
		fragment.csd_form_url = csdFormUrl;

		base1_config.csd_form_fragments.push( fragment );
	}
}


function register_csd_screen_form( baseFormUrl, csdFormUrl, anchorName )
{
	baseScreenFormUrl = ReplaceUrlPathSuffix( baseFormUrl, '.xmd', '.xms' );

	if ( anchorName == undefined )
		anchorName = 'DefaultCsdAnchor';

	if ( ! UseLds )
	{
		fragment = new Object;
		fragment.base_screen_form_url = baseScreenFormUrl;
		fragment.csd_screen_form_url = csdFormUrl;
		fragment.anchor_name = anchorName;

		base1_config.csd_screen_form_fragments.push( fragment );
	}
	
	if ( LdsIsClient )
		MergeScreenForm( baseScreenFormUrl, csdFormUrl, anchorName );
}


function register_screen_form_fragment( baseScreenFormUrl, subFormUrl, anchorName )
{
	MergeScreenForm( baseScreenFormUrl, subFormUrl, anchorName );
}


function register_module_std_card_objects_csd( moduleID )
{
	for ( cardObjectType in OpenDoc( '//' + moduleID + '/' + moduleID + '_std_card_object_types.xml' ).TopElem )
	{
		if ( ! cardObjectType.use_csd )
			continue;

		csdFormUrl = get_object_csd_form_url( cardObjectType.id );

		try
		{
			FetchForm( csdFormUrl );
		}
		catch ( e )
		{
			if ( ! UseLds && FilePathExists( UrlToFilePath( csdFormUrl ) ) )
				alert( e );

			continue;
		}

		register_csd_data_form( DefaultDb.GetObjectForm( cardObjectType.id ).Url, csdFormUrl );
	}
}


function register_object_csd( objectFormUrl )
{
	objectForm = FetchForm( objectFormUrl );
	csdFormUrl = get_object_csd_form_url( objectForm.TopElem.Name );

	if ( System.IsWebClient )
	{
		oldUseDebugMode = EvalBrowserScript( 'gBmUseDebugMode' );
		EvalBrowserScript( 'gBmUseDebugMode = false' );
	}

	formExists = true;

	try
	{
		FetchForm( csdFormUrl );
	}
	catch ( e )
	{
		if ( ! UseLds && UrlExists( UrlToFilePath( csdFormUrl ) ) )
			alert( e );

		formExists = false;
	}

	if ( System.IsWebClient )
		EvalBrowserScript( 'gBmUseDebugMode = ' + CodeLiteral( oldUseDebugMode ) );

	if ( formExists )
		register_csd_data_form( objectFormUrl, csdFormUrl );
}


function register_card_objects_csd_screen_forms( moduleID )
{
	for ( cardObjectType in card_object_types )
	{
		if ( ! cardObjectType.use_csd )
			continue;

		csdFormUrl = get_object_csd_form_url( cardObjectType.id );

		if ( GetOptCachedForm( csdFormUrl ) == undefined )
			continue;

		register_csd_screen_form( DefaultDb.GetObjectForm( cardObjectType.id ).Url, csdFormUrl );
	}
}


function get_object_csd_form_url( objectTypeID )
{
	'x-local://data/csd/csd_' + objectTypeID + '.xmc';
}


function register_attr_csd_form( srcArray, formUrl, baseElemPath )
{
	form = FetchForm( formUrl );
	baseElem = form.TopElem.EvalPath( baseElemPath );

	for ( srcElem in srcArray )
	{
		elem = baseElem.AddChild( srcElem.id, 'bool' );
		elem.NullFalse = true;
		elem.Title = srcElem.name;
	}
}


function get_attr_csd_desc( baseElem, templateArray )
{
	desc = '';

	for ( attr in templateArray )
	{
		elem = baseElem.Child( attr.id );
		if ( ! elem )
			continue;

		if ( desc != '' )
			desc += ';  ';

		desc += attr.name;
	}

	return desc;
}


