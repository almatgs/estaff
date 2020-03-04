"META:ALLOW-CALL-FROM-CLIENT:1";
function enable_all_objects_ft_population()
{
	if ( UseLds )
		return CallServerMethod( 'lib_sql', 'enable_all_objects_ft_population' );

	if ( ! DefaultDb.UseSqlStorage )
		return;

	query = 'ALTER FULLTEXT INDEX ON [(spxml_large_fields)] SET CHANGE_TRACKING AUTO';
	
	try
	{
		DefaultDb.RunSql( query );
	}
	catch ( e )
	{
	}

	for ( cardObjectType in card_object_types )
	{
		query = 'ALTER FULLTEXT INDEX ON [' + lib_base.object_name_to_catalog_name( cardObjectType.id ) + '] SET CHANGE_TRACKING AUTO';
		DefaultDb.RunSql( query );
	}
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function disable_all_objects_ft_population()
{
	if ( UseLds )
		return CallServerMethod( 'lib_sql', 'disable_all_objects_ft_population' );

	if ( ! DefaultDb.UseSqlStorage )
		return;

	query = 'ALTER FULLTEXT INDEX ON [(spxml_large_fields)] SET CHANGE_TRACKING OFF';

	try
	{
		DefaultDb.RunSql( query );
	}
	catch ( e )
	{
	}

	for ( cardObjectType in card_object_types )
	{
		query = 'ALTER FULLTEXT INDEX ON [' + lib_base.object_name_to_catalog_name( cardObjectType.id ) + '] SET CHANGE_TRACKING OFF';
		DefaultDb.RunSql( query );
	}
}
