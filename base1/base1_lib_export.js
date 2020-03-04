function run_export_scenario( scenario )
{
	if ( scenario.dest_dir_path == '' )
		return;

	if ( ! PathIsDirectory( scenario.dest_dir_path ) )
		throw UserError( 'Invalid export path: ' + scenario.dest_dir_path );

	exportDate = Date();

	if ( scenario.filter.object_type_id.HasValue )
	{
		for ( objectTypeID in scenario.filter.object_type_id.Instances )
			run_export_scenario_for_object_type( scenario, objectTypeID );
	}
	else
	{
		for ( objectType in card_object_types )
			run_export_scenario_for_object_type( scenario, objectType.id )
	}

	scenarioDoc = DefaultDb.OpenObjectDoc( 'export_scenario', scenario.id );
	scenarioDoc.TopElem.filter.min_date = exportDate;
	scenarioDoc.Save();
}


function run_export_scenario_for_object_type( scenario, objectTypeID )
{
	query = 'for $elem in ' + lib_base.object_name_to_catalog_name( objectTypeID );
	
	if ( scenario.filter.min_date != null )
		query = query + ' where $elem/last_mod_date >= date( \'' + scenario.filter.min_date + '\' )';

	query = query + ' return $elem';

	//alert( query );

	array = XQuery( query );

	for ( elem in array )
	{
		try
		{
			doc = DefaultDb.OpenObjectDoc( objectTypeID, elem.id );
		}
		catch ( e )
		{
			continue;
		}

		destUrl = FilePathToUrl( scenario.dest_dir_path ) + '/' + objectTypeID + '-0x' + StrHexInt( elem.id, 16 ) + '.xml';
		doc.SaveToUrl( destUrl );
	}
}



