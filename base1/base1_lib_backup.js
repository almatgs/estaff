function run_backup()
{
	if ( ! global_settings.backup.dest_dir_path.HasValue )
		throw UserError( 'Backup directory has not been specified' );

	if ( ! PathIsDirectory( global_settings.backup.dest_dir_path ) )
		throw UserError( 'Invalid directory path: ' + global_settings.backup.dest_dir_path );

	useIncBackup = global_settings.backup.use_inc_backup;

	if ( useIncBackup )
	{
		if ( ! global_settings.backup.last_inc_backup_date.HasValue )
			useIncBackup = false;
		else if ( global_settings.backup.min_full_backup_days_range.HasValue && global_settings.backup.last_full_backup_date.HasValue && lib_base.get_date_days_diff( CurDate, global_settings.backup.last_full_backup_date ) >= global_settings.backup.min_full_backup_days_range )
			useIncBackup = false;
	}

	if ( useIncBackup )
		run_inc_backup();
	else
		run_full_backup();
}


function run_full_backup()
{
	exportDate = CurDate;

	archivePath = FilePath( global_settings.backup.dest_dir_path, build_archive_name( DateNewTime( CurDate ), false ) );
	if ( FilePathExists( archivePath ) )
		archivePath = FilePath( global_settings.backup.dest_dir_path, build_archive_name( CurDate, false ) );

	filesArray = ArrayExtract( ReadDirectoryByPath( DefaultDb.StorageDirectory ), 'FileName( This )' );
	filesArray = ArraySelect( filesArray, 'This != \'ft\' && This != \'secondary\'' );

	ZipCreate( archivePath, filesArray, {BaseDir:DefaultDb.StorageDirectory} );
 
	//ZipCreate( archivePath, DefaultDb.StorageDirectory );

	global_settings.backup.last_full_backup_date = exportDate;
	global_settings.backup.last_inc_backup_date = exportDate;
	global_settings.Doc.Save();
}


function run_inc_backup()
{
	exportDate = CurDate;
	tempDir = ObtainTempDirectoryPath();

	for ( objectForm in DefaultDb.ObjectForms )
	{
		if ( ! objectForm.TopElem.ChildExists( 'last_mod_date' ) )
			continue;

		export_object_data( tempDir, objectForm, global_settings.backup.last_inc_backup_date );
	}

	archivePath = FilePath( global_settings.backup.dest_dir_path, build_archive_name( DateNewTime( CurDate ), true ) );
	if ( FilePathExists( archivePath ) )
		archivePath = FilePath( global_settings.backup.dest_dir_path, build_archive_name( CurDate, true ) );
	
	ZipCreate( archivePath, '*', {BaseDir:tempDir} );

	DeleteDirectory( tempDir );

	global_settings.backup.last_inc_backup_date = exportDate;
	global_settings.Doc.Save();
}


function export_object_data( destDir, objectForm, startDate )
{
	query = 'for $elem in ' + lib_base.object_name_to_catalog_name( objectForm.TopElem.Name );

	if ( startDate != null )
		query += ' where $elem/last_mod_date >= ' + XQueryLiteral( startDate );

	query += ' return $elem';

	array = XQuery( query );

	for ( record in array )
	{
		try
		{
			doc = OpenDoc( record.ObjectUrl );
		}
		catch ( e )
		{
			LogEvent( '', 'Unable to open document ' + record.ObjectUrl + '. ' + e );
		}

		destUrl = FilePathToUrl( destDir ) + '/' + objectForm.TopElem.Name + '-0x' + StrHexInt( record.id, 16 ) + '.xml';
		doc.SaveToUrl( destUrl );
	}
}


function build_archive_name( date, isIncBackup )
{
	return StrLowerCase( AppID ) + ( isIncBackup ? '-backup-incremental-' : '-backup-' ) + StrReplace( StrXmlDate( date ), ':', '-' ) + '.zip';
}

