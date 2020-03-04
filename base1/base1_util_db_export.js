function HandleExportDbConfig()
{
	dlgDoc = OpenDoc( 'base1_dlg_db_export_config.xml' );
	dlgDoc.TopElem.dest_dir_path = local_settings.export_db_config_last_data.dest_dir_path;
	dlgDoc.TopElem.export_static_data = true;
	dlgDoc.TopElem.export_csd = true;
	dlgDoc.TopElem.export_vocs = true;
	
	ActiveScreen.ModalDlg( dlgDoc );

	local_settings.export_db_config_last_data.dest_dir_path = dlgDoc.TopElem.dest_dir_path;
	local_settings.Doc.Save();

	if ( ! dlgDoc.TopElem.dest_dir_path.HasValue )
		throw UiError( UiText.errors.dir_not_specified );

	ExportDbConfig( dlgDoc.TopElem.dest_dir_path, dlgDoc.TopElem );
}


function ExportDbConfig( destDir, options )
{
	destBaseDir = FilePath( destDir, 'estaff_db_config' );
	ObtainDirectory( destBaseDir );
	ObtainDirectory( FilePath( destBaseDir, 'obj' ) );

	if ( options.export_static_data )
		ExportDbStaticData( destBaseDir );

	if ( options.export_csd )
		ExportDbCsd( destBaseDir );

	if ( options.export_vocs )
		ExportDbVocs( destBaseDir );
}


function ExportDbStaticData( destBaseDir )
{
	urlsArray = new Array;

	urlsArray.push( 'x-local://data/static/base1_fields_usage.xml' );
	urlsArray.push( 'x-local://data/static/base1_agents_settings.xml' );
	urlsArray.push( 'x-local://data/static/base1_fields_usage.xml' );
	urlsArray.push( 'x-local://data/static/cn_global_settings.xml' );
	urlsArray.push( 'x-local://data/static/global_settings.xml' );
	urlsArray.push( 'x-local://data/static/imod_global_settings.xml' );
	urlsArray.push( 'x-local://data/static/outlook_global_settings.xml' );
	urlsArray.push( 'x-local://data/static/ras_global_settings.xml' );
	urlsArray.push( 'x-local://data/static/wts_global_settings.xml' );

	for ( url in urlsArray )
	{
		doc = GetOptCachedDoc( url );
		if ( doc == undefined )
			continue;
		
		destUrl = UrlAppendPath( FilePathToUrl( destBaseDir ), UrlPath( url ) );

		ObtainDirectory( UrlParent( destUrl ) );
		doc.SaveToUrl( destUrl );
	}
}


function ExportDbCsd( destBaseDir )
{
	for ( cardObjectType in card_object_types )
	{
		if ( ! cardObjectType.use_csd )
			continue;

		url = lib_csd.get_object_csd_form_url( cardObjectType.id );

		try
		{
			dataStr = LoadUrlData( url );
		}
		catch ( e )
		{
			continue;
		}

		destUrl = UrlAppendPath( FilePathToUrl( destBaseDir ), UrlPath( url ) );
		ObtainDirectory( UrlParent( destUrl ) );

		PutUrlData( destUrl, dataStr );
	}
}


function ExportDbVocs( destBaseDir )
{
	for ( vocInfo in vocs )
	{
		ExportVoc( vocInfo, destBaseDir );
	}
}


function ExportVoc( vocInfo, destBaseDir )
{
	useShortStorage = true;

	if ( vocInfo.id == 'mail_templates' )
		useShortStorage = false;

	catalog = DefaultDb.GetOptCatalog( vocInfo.id );

	if ( useShortStorage )
		ExportShortStorageCatalogObjects( catalog, destBaseDir );
	else
		ExportCatalogObjects( catalog, destBaseDir );
}


function ExportCatalogObjects( catalog, destBaseDir )
{
	for ( record in catalog )
	{
		doc = OpenDoc( record.ObjectUrl );

		destUrl = UrlAppendPath( FilePathToUrl( destBaseDir ), "obj/" + catalog.Name + '/' + record.id + '.xml' );
		//DebugMsg( destUrl );

		ObtainDirectory( UrlParent( destUrl ), true );
		doc.SaveToUrl( destUrl );
	}
}


function ExportShortStorageCatalogObjects( catalog, destBaseDir )
{
	destDoc = OpenNewDoc( catalog.Form.Url );

	for ( record in catalog )
	{
		destElem = destDoc.TopElem.AddChild();
		destElem.AssignElem( record );
	}

	destUrl = UrlAppendPath( FilePathToUrl( destBaseDir ), "obj/xml/" + catalog.Name + '.xml' );
	ObtainDirectory( UrlParent( destUrl ), true );
	destDoc.SaveToUrl( destUrl );
}

