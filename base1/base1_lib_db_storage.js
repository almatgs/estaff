function IsDbV2Installed()
{
	param = BuildParam();
	return FilePathExists( param.pgDirPath );
}


function GetDbV2SetupDirDesc( param )
{
	dirExists = FilePathExists( param.pgDirPath );

	if ( param.useSharedDbEngine )
	{
		return param.pgDirPath + ( dirExists ? '' : '  (!)' );
	}
	else
	{
		return ( dirExists ? '+' : '-' );
	}

	return param.pgDirPath;
}


function GetDbV2DaemonStateDesc( param )
{
	try
	{
		daemonState = DaemonGetState( param.daemonID );
	}
	catch ( e )
	{
		return '-';
	}

	return lib_base.GetDaemonStateDesc( daemonState );
}


function GetDbV2DataDirDesc( param )
{
	dirExists = FilePathExists( param.dataDirPath );
	if ( ! dirExists )
		return '-';

	return param.dataDirPath;
}


function HandleCreateDbV2Instance( param )
{
	if ( FilePathExists( param.dataDirPath ) )
		throw UiError( UiText.errors.dir_already_exists + ': ' + param.dataDirPath );

	InitStoragePassword( param );

	CreatePostgresDbCluster( param );
	ChangePostgresConfigFile( param );
	
	RegisterPostgresDaemon( param );

	//CreatePostgresDb( param );
	BuildAppConfigFile( param );
}


function HandleRegisterDbV2Daemon( param )
{
	RegisterPostgresDaemon( param );
	//DaemonStart( param.daemonID );
}


function HandleCopyDbV2Password( param )
{
	SetClipboard( param.password );
}


function BuildParam()
{
	param = new Object;

	param.pgDirPath = AppConfig.GetOptProperty( 'PG-DIR' );
	if ( param.pgDirPath != undefined )
	{
		param.useSharedDbEngine = true;
		param.port = 9300;
	}
	else
	{
		if ( System.IsX64 )
			param.pgDirPath = FilePath( AppDirectoryPath(), 'pg-win64' );
		else
			param.pgDirPath = FilePath( AppDirectoryPath(), 'pg-win32' );

		param.useSharedDbEngine = false;

		param.dataDirPath = FilePath( AppDirectoryPath(), 'DbData' );
		param.port = 9400;
	}

	param.pgBinDirPath = FilePath( param.pgDirPath, 'bin' );


	if ( AppID == 'EStaff' || AppID == 'EStaff_Server' )
		param.dbName = 'EStaff';
	else
		param.dbName = StrReplaceOne( AppID, '_Server', '' );

	param.daemonID = AppID;
	if ( StrEnds( param.daemonID, '_Server' ) )
		param.daemonID = StrReplaceOne( param.daemonID, '_Server', '' );
	param.daemonID += '_Database_Server';

	if ( AppID == 'EStaff' || AppID == 'EStaff_Server' )
		param.daemonName = 'E-Staff';
	else
		param.daemonName = AppName;
	if ( StrEnds( param.daemonName, ' Server' ) )
		param.daemonName = StrReplaceOne( param.daemonName, ' Server', '' );
	param.daemonName += ' Database Server';

	param.password = undefined;

	configFilePath = FilePath( AppDirectoryPath(), 'app_config.xml' );
	if ( ! FilePathExists( configFilePath ) )
		configFilePath = FilePath( AppDirectoryPath(), 'app_migration_config.xml' );
	if ( FilePathExists( configFilePath ) )
	{
		appConfigDoc = OpenDoc( FilePathToUrl( configFilePath ), 'form=//app/sx_app_config.xmd' );
		appConfig = appConfigDoc.TopElem;

		if ( appConfig.storage.type == 'std.v2' || ( appConfig.storage.type == 'sql' && appConfig.storage.db_type == 'postgresql' ) )
		{
			if ( appConfig.storage.password_ed.HasValue )
			{
				param.password = StrStdDecrypt( appConfig.storage.password_ed );
			}
		}
	}

	return param;
}


function InitStoragePassword( param )
{
	if ( param.GetOptProperty( 'password' ) != undefined )
		return;

	param.password = StrLowerCase( Md5Hex( AppSn + ' E' ) );
}


function SetupDbStorage()
{
	param = BuildParam();

	if ( FilePathExists( param.dataDirPath ) )
		throw UiError( UiText.errors.dir_already_exists + ': ' + param.dataDirPath );

	InitStoragePassword( param );

	CreatePostgresDbCluster( param );
	ChangePostgresConfigFile( param );
	
	RegisterPostgresDaemon( param );

	CreatePostgresDb( param );
	BuildAppConfigFile( param );
}



function CreatePostgresDbCluster( param )
{
	tempFilePath = UrlToFilePath( ObtainTempFile() );
	ObtainDirectory( ParentDirectory( tempFilePath ) );
	PutFileData( tempFilePath, param.password );

	//InitAppConsole();

	exeFilePath = FilePath( FilePath( param.pgDirPath, 'bin' ), 'initdb.exe' );

	argStr = '--encoding=UTF8';
	argStr += ' --lc-messages=English';
	argStr += ' --auth=password';
	argStr += ' --username=spxml';
	argStr += ' --pwfile="' + tempFilePath + '"';
	argStr += ' --pgdata="' + param.dataDirPath + '"';

	//PutUrlData( 'x-local://Logs/zz.txt', argStr );

	options = 'wait=1;hidden=1;exitCodeException=1;stdErr=1;';
	options += 'work-dir="' + FilePath( param.pgDirPath, 'bin' ) + '"';

	retVal = ProcessExecute( exeFilePath, argStr, options );
	DeleteFile( tempFilePath );
	//if ( retVal != 0 )
		//throw 'initdb error: ' + retVal;

	LogEvent( '', 'PG: ' + param.password );
}


function ChangePostgresConfigFile( param )
{
	configFilePath = FilePath( param.dataDirPath, 'postgresql.conf' );
	dataStr = LoadFileData( configFilePath );

	dataStr = StrReplaceOne( dataStr, '\n#port = 5432\t', '\nport = ' + param.port + '\t' );
	PutFileData( configFilePath, dataStr );
}


function RegisterPostgresDaemon( param )
{
	exeFilePath = FilePath( FilePath( param.pgDirPath, 'bin' ), 'pg_ctl.exe' );

	if ( false )
	{
		cmdArgStr = 'register -N ' + param.daemonID + ' -D "' + param.dataDirPath + '"';

		options = 'wait=1;hidden=1;exitCodeException=1;stdErr=1;';
		options += 'work-dir="' + FilePath( param.pgDirPath, 'bin' ) + '"';

		retVal = ProcessExecute( exeFilePath, cmdArgStr, options );
	}


	cmdArgStr = 'runservice -N "' + param.daemonID + '" -D "' + param.dataDirPath + '" -w';

	RegisterDaemon( param.daemonID, param.daemonName, exeFilePath, cmdArgStr, false );

	if ( DaemonGetState( param.daemonID ) == 0 )
	{
		DaemonStart( param.daemonID );
		WaitForDaemonStart( param.daemonID, 5000 );
	}
}


function UnregisterPostgresDaemon( param )
{
	if ( DaemonGetState( param.daemonID ) == 1 )
		DaemonStop( param.daemonID );

	UnregisterDaemon( param.daemonID );

}


function CreatePostgresDb( param )
{
	exeFilePath = FilePath( FilePath( param.pgDirPath, 'bin' ), 'createdb.exe' );

	cmdArgStr = '';
	//cmdArgStr = '--host=muse';
	cmdArgStr += ' --port=' + param.port;
	cmdArgStr += ' --username=spxml';
	cmdArgStr += ' --no-password';
	cmdArgStr += ' ' + param.dbName;

	options = 'wait=1;hidden=1;exitCodeException=1;stdErr=1;';
	options += 'work-dir="' + FilePath( param.pgDirPath, 'bin' ) + '"';

	env = {PGPASSWORD:param.password};

	retVal = ProcessExecute( exeFilePath, cmdArgStr, options, env );
}


function BuildAppConfigFile( param, fileName )
{
	if ( fileName == undefined )
		fileName = 'app_migration_config.xml';

	fileUrl = FilePathToUrl( FilePath( AppDirectoryPath(), fileName ) );

	appConfigDoc = OpenNewDoc( 'x-app://app/sx_app_config.xmd' );
	appConfig = appConfigDoc.TopElem;

	appConfig.storage.type = 'std.v2';
	appConfig.storage.server = 'localhost:' + param.port;
	appConfig.storage.database = param.dbName;
	appConfig.storage.login = 'spxml';
	appConfig.storage.password_ed = StrStdEncrypt( param.password );

	appConfigDoc.SaveToUrl( fileUrl, 'tabs=1' );
}


function HandleBackupDb( param )
{
	destFileName = param.dbName + '-' + StrReplace( StrXmlDate( CurDate, false ), ':', '-' );
	destFileName += '.backup';

	destFileUrl = ActiveScreen.AskFileSave( destFileName );
	destFilePath = UrlToFilePath( destFileUrl );

	cmdArgStr = '--no-password';
	cmdArgStr += ' --port=' + param.port;
	cmdArgStr += ' --username=spxml';
	cmdArgStr += ' --format=custom';
	//cmdArgStr += ' --compress=9';
	cmdArgStr += ' --file="' + destFilePath + '"';
	//cmdArgStr += ' --verbose';

	options = 'wait=1;exitCodeException=1;stdErr=1;';
	options += 'work-dir="' + param.pgBinDirPath + '"';

	cmdArgStr += ' "' + param.dbName + '"';

	env = {PGPASSWORD:param.password};

	retVal = ProcessExecute( FilePath( param.pgBinDirPath, 'pg_dump.exe' ), cmdArgStr, options, env );
	if ( retVal != 0 )
		throw retVal;

	lib_base.show_info_message( ActiveScreen, UiText.messages.operation_completed_successfully );
}


function HandleRestoreDbFromBackup( param )
{
	srcFileUrl = ActiveScreen.AskFileOpen();
	srcFilePath = UrlToFilePath( srcFileUrl );

	configFilePath = FilePath( AppDirectoryPath(), 'app_config.xml' );
	if ( ! FilePathExists( configFilePath ) && ! param.useSharedDbEngine )
	{
		InitStoragePassword( param );

		if ( ! FilePathExists( param.dataDirPath ) )
		{
			CreatePostgresDbCluster( param );
			ChangePostgresConfigFile( param );
			RegisterPostgresDaemon( param );
		}

		CreatePostgresDb( param );
		BuildAppConfigFile( param, 'app_config.xml' );
	}

	cmdArgStr = '--no-password';
	cmdArgStr += ' --no-owner';
	
	//cmdArgStr += ' --create';
	cmdArgStr += ' --clean';

	/*if ( AppConfig.GetOptProperty( 'db-restore-clean' ) == '1' )
	{
		cmdArgStr += ' --clean';
	}*/

	cmdArgStr += ' --schema public';
	
	cmdArgStr += ' --port=' + param.port;
	cmdArgStr += ' --username=spxml';
	cmdArgStr += ' --dbname="' + param.dbName + '"';
	//cmdArgStr += ' --verbose';
	//cmdArgStr += ' --exit-on-error';

	options = 'wait=1;exitCodeException=1;stdErr=1;';
	options += 'work-dir="' + param.pgBinDirPath + '"';

	cmdArgStr += ' "' + srcFilePath + '"';

	env = {PGPASSWORD:param.password};

	retVal = ProcessExecute( FilePath( param.pgBinDirPath, 'pg_restore.exe' ), cmdArgStr, options, env );
	if ( retVal != 0 )
		throw retVal;

	lib_base.show_info_message( ActiveScreen, UiText.messages.operation_completed_successfully );
}


function WaitForDaemonStart( daemonID, maxWaitTicks )
{
	startTicks = GetCurTicks();

	while ( true )
	{
		if ( DaemonGetState( daemonID ) == 1 )
			break;

		if ( GetCurTicks() - startTicks > maxWaitTicks )
			break;

		Sleep( 100 );
	}
}
