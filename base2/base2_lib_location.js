function handle_load_std_locations()
{
	lib_base.check_desktop_client();

	countryID = global_settings.country_id;

	if ( ! lib_location.get_country_package_spec( countryID ).has_locations )
		throw UiError( 'Localization package is not found' );
	
	if ( ArrayOptFind( locations, 'id == name' ) != undefined )
		lib_base.ask_warning_to_continue( ActiveScreen, UiText.messages.old_locations_exist );

	dlgDoc = OpenDoc( 'base2_dlg_load_locations.xml' );
	dlgDoc.TopElem.country_id = countryID;
	
	ActiveScreen.ModalDlg( dlgDoc );

	stdLocations = get_country_std_locations( dlgDoc.TopElem.country_id );

	for ( stdLocation in stdLocations )
	{
		//if ( stdLocation.parent_id.HasValue )
			//continue;

		if ( ! dlgDoc.TopElem.sel_location_id.ByValueExists( stdLocation.id ) )
			continue;

		locationID = load_std_location( stdLocation, '' );

		if ( dlgDoc.TopElem.load_depth_id == 'district_main_cities' )
			load_sub_std_locations( stdLocations, stdLocation, locationID, 0 );
	}
}


function load_sub_std_locations( stdLocations, baseStdLocation, parentID, level )
{
	if ( level >= 2 )
		return;

	for ( stdLocation in stdLocations )
	{
		if ( stdLocation.parent_id != baseStdLocation.id )
			continue;

		if ( stdLocation.type_id == 10 )
		{
			load_std_location( stdLocation, parentID );
		}
		else
		{
			//DebugMsg( stdLocation.Xml );
			load_sub_std_locations( stdLocations, stdLocation, parentID, level + 1 );
		}
	}
}


function load_std_location( stdLocation, parentID )
{
	if ( ArrayOptFindByKey( locations, stdLocation.id ) != undefined )
	{
		locationDoc = DefaultDb.OpenObjectDoc( 'location', stdLocation.id );
		location = locationDoc.TopElem;
		isNew = false;
	}
	else
	{
		locationDoc = DefaultDb.OpenNewObjectDoc( 'location', stdLocation.id );
		location = locationDoc.TopElem;
		isNew = true;
	}

	prevParentID = RValue( location.parent_id );

	location.AssignElem( stdLocation );

	if ( isNew )
		location.parent_id = parentID;
	else
		location.parent_id = prevParentID;

	location.is_std = true;
	locationDoc.Save();

	return location.id;
}


function handle_load_std_metro_stations()
{
	lib_base.check_desktop_client();

	if (!lib_location.get_country_package_spec(global_settings.country_id).has_locations)
		throw UiError( 'Localization package is not found' );

	stdLocations = ArraySelect( get_country_std_locations( global_settings.country_id ), 'has_metro' );

	stdLocations = ArraySelect( stdLocations, 'ArrayOptFindByKey( locations, name, \'name\' ) != undefined' );
	stdLocations = ArraySort( stdLocations, 'name', '+' );

	if ( ArrayCount( stdLocations ) == 0 )
		throw UserError( 'No locations with metro map found' );

	stdLocations = lib_base.select_elems( stdLocations );

	for ( stdLocation in stdLocations )
		load_std_location_metro_stations( stdLocation );
}


function load_std_location_metro_stations( stdLocation )
{
	countryID = StrScan( stdLocation.id, '%s.%*s' )[0];

	srcMap = OpenDoc( '//regional/' + countryID + '/metro_' + StrReplace( stdLocation.id, '.', '_' ) + '.xml', 'form=base2_metro_map.xmd;ui-text=1' ).TopElem;
	//alert( srcMap.Xml );

	location = ArrayOptFindByKey( locations, stdLocation.name, 'name' );

	for ( srcStation in srcMap.stations )
	{
		//srcLine = ArrayOptFindByKey( srcMap.lines, srcStation.line_id, 'id' );

		stationID = stdLocation.id + '.' + srcStation.id;
		if ( ArrayOptFindByKey( metro_stations, stationID ) != undefined )
			continue;

		stationDoc = DefaultDb.OpenNewObjectDoc( 'metro_station', stationID );
		station = stationDoc.TopElem;

		station.AssignElem( srcStation );
		station.location_id = location.id;

		//if ( srcLine != undefined )
			//stationDoc.TopElem.text_color = MixColors( srcLine.color, '255,255,255' );

		station.is_std = true;
		stationDoc.Save();
	}

	if ( ! location.has_metro )
	{
		locationDoc = OpenDoc( location.ObjectUrl );
		locationDoc.TopElem.has_metro = true;
		locationDoc.Save();
	}
}


function load_location_metro_stations( locationID )
{
	location = ArrayOptFindByKey( locations, locationID );

	stdLocations = new Array();

	for ( country in get_std_countries() )
		stdLocations = ArrayUnion( stdLocations, ArraySelect( get_country_std_locations( country.id ), 'has_metro' ) );

	stdLocation = ArrayOptFindByKey( stdLocations, location.name, 'name' );
	if ( stdLocation == undefined )
		return;

	load_std_location_metro_stations( stdLocation );
}


function get_std_countries()
{
	array = FetchDoc( '//regional/countries.xml' ).TopElem;
	return array;
}


function get_country_packages()
{
	array = FetchDoc( '//regional/country_packages.xml' ).TopElem;
	return array;
}


function get_opt_country_package_spec( countryID )
{
	return ArrayOptFindByKey( get_country_packages(), countryID, 'country_id' );
}


function get_country_package_spec( countryID )
{
	spec = get_opt_country_package_spec( countryID );
	if ( spec != undefined )
		return spec;

	return CreateElem( 'base2_country_packages.xmd', 'country_packages.country_package' );
}


function get_country_std_locations( countryID )
{
	return FetchDoc( '//regional/' + StrLowerCase( countryID ) + '/locations_' + StrLowerCase( countryID ) + '.xml' ).TopElem;
}


function guess_default_country_id()
{
	if ( true )
	{
		if ( ! LdsIsClient )
			return '';
	}

	/*countryID = global_settings.default_location_id.ForeignElem.country_id;
	if ( countryID != '' )
		return countryID;
	*/

	if ( AppUiLangID == 'ua' )
		return 'UKR';

	countryID = lib_location.get_sys_country_id();
	if ( countryID != '' )
		return countryID;

	return 'RUS';
}


function get_sys_country_id()
{
	if ( System.IsWebClient )
		return '';

	countryName = GetSysRegStrValue( 'HKEY_CURRENT_USER\\Control Panel\\International', 'sCountry' );
	return GetCountryIDByName( countryName );
}


function GetCountryIDByName( countryName )
{
	if ( countryName == '' )
		return '';

	if ( countryName == 'ад' )
		return 'RUS' ;

	doc = FetchDoc( '//regional/countries_int.xml' );

	country = ArrayOptFind( doc.TopElem, 'name_en == countryName || name_ru == countryName || name_ua == countryName || full_name_en == countryName || full_name_ru == countryName' );
	if ( country != undefined )
		return country.id;

	return '';
}


function GetCountryIDByLocationID( locationID )
{
	if ( locationID == '' )
		return '';

	if ( ( obj = StrOptScan( locationID, '%s.%*s' ) ) != undefined )
	{
		country = ArrayOptFindByKey( countries, StrUpperCase( obj[0] ) );
		if ( country != undefined )
			return country.id;
	}

	return '';
}


function IsStdLocationID( locationID )
{
	return ( StrContains( locationID, '.' ) && StrLowerCase( locationID ) == locationID );
}


function GetMyStdCountryInfo()
{
	stdCountry = ArrayOptFindByKey( get_std_countries(), global_settings.country_id, 'id' );
	if ( stdCountry == undefined )
		return CreateElem( '//base2/base2_std_countries.xmd', 'std_countries.std_country' );
	
	return stdCountry;
}


function GetLocationTimeZone( locationID )
{
	if ( locationID == '' )
		return null;

	for ( location in lib_base.get_hier_chain( locations, locationID ) )
	{
		if ( location.time_zone.HasValue )
			return location.time_zone;
	}

	return null;
}