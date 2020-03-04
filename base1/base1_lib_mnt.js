function check_server_version()
{
	if ( AppBuildDate >= LdsServerBuildDate && ( LdsServerAppVersion == '' || AppVersion >= LdsServerAppVersion ) )
		return;

	if ( true )
	{
		ActiveScreen.MsgBox( UiText.messages.server_new_build_will_be_installed, UiText.messages.warning_msg_title, 'info', 'ok,cancel' );
	}
	else
	{
		if ( ! ActiveScreen.MsgBox( UiText.messages.server_has_new_build, UiText.messages.warning_msg_title, 'warning', 'yes,no' ) )
		{
			check_server_version_mismatch();
			return;
		}
	}

	task = new BackgroundTask;
	task.ShowProgress = true;

	task.CallMethod( 'lib_mnt', 'LoadUpdatePackage' );
	Cancel();
}


function LoadUpdatePackage()
{
	progress = new TaskProgress;
	progress.TaskName = UiText.messages.loading_client_update;

	packageUrl = CallServerMethod( 'lib_mnt', 'prepare_client_update' );
	
	tempDir = UrlToFilePath( ObtainSessionTempFile() );
	CreateDirectory( tempDir );

	tempFilePath = FilePath( tempDir, 'client-setup.zip' );
	PutFileData( tempFilePath, LoadUrlData( packageUrl ) );

	ZipExtract( tempFilePath, tempDir );

	if ( true )
		exeFileName = 'sx_stp.exe';
	else
		exeFileName = 'sx_setup.exe';

	MoveFile( FilePath( FilePath( tempDir, 'Uninstall' ), 'sx_setup.exe' ), FilePath( tempDir, exeFileName ) );
	//MoveFile( FilePath( FilePath( tempDir, 'Uninstall' ), 'sx_setup.exe.manifest' ), FilePath( tempDir, 'sx_setup.exe.manifest' ) );

	scriptFile = FilePath( tempDir, 'client_setup.xjs' );
	PutFileData( scriptFile, StrReplace( LoadUrlData( 'base1_client_setup_SAMPLE.xjs' ), '\'##DEST_DIR##\'', CodeLiteral( AppDirectoryPath() ) ) );

	ShellExecute( 'open', FilePath( tempDir, exeFileName ), '"' + scriptFile + '"' );
}


function check_server_version_mismatch()
{
	if ( LdsServerAppVersion != '' && AppVersion < LdsServerAppVersion )
		throw UserError( StrReplaceOne( StrReplaceOne( UiText.errors.server_version_xxx_mismatch, '%s', LdsServerAppVersion ), '%s', AppVersion ) );
}


"META:ALLOW-CALL-FROM-CLIENT:1";

function prepare_client_update()
{
	EvalCs( 'prepare_client_update_core()' );
}


function prepare_client_update_core()
{
	packageUrl = 'x-local://share/client-update-' + StrReplace( StrReplace( StrXmlDate( AppBuildDate ), ':', '' ), 'T', '-' ) + '.zip';
	
	packagePath = UrlToFilePath( packageUrl );
	if ( FilePathExists( packagePath ) )
		return packageUrl;

	ObtainDirectory( ParentDirectory( packagePath ) );
	

	itemsArray = new Array();
	itemsArray[itemsArray.length] = 'app';
	itemsArray[itemsArray.length] = 'app2.xfp';

	//itemsArray[itemsArray.length] = 'app1';
	itemsArray[itemsArray.length] = 'base1';
	itemsArray[itemsArray.length] = 'base2';
	itemsArray[itemsArray.length] = 'base_pict';
	itemsArray[itemsArray.length] = 'cn';
	itemsArray[itemsArray.length] = 'ui';
	itemsArray[itemsArray.length] = 'misc';
	itemsArray[itemsArray.length] = 'RParse';

	itemsArray[itemsArray.length] = 'chrome.xfp';
	itemsArray[itemsArray.length] = 'conn_google.xfp';
	//itemsArray[itemsArray.length] = 'conn_mcaller';
	itemsArray[itemsArray.length] = 'cproc.xfp';
	itemsArray[itemsArray.length] = 'firefox';
	itemsArray[itemsArray.length] = 'gate';
	itemsArray[itemsArray.length] = 'lotus';
	itemsArray[itemsArray.length] = 'outlook.xfp';
	itemsArray[itemsArray.length] = 'thunderbird';

	itemsArray[itemsArray.length] = 'SpXml.exe';
	itemsArray[itemsArray.length] = 'funzip.dll';
	itemsArray[itemsArray.length] = 'datex_gate.dll';
	itemsArray[itemsArray.length] = 'datex_gate_x64.dll';
	itemsArray[itemsArray.length] = 'datex_gate_config.xml';
	itemsArray[itemsArray.length] = 'gdiplus.dll';

	if ( AppModuleUsed( 'crm' ) )
	{
		itemsArray[itemsArray.length] = 'crm';
	}
	else
	{
		itemsArray[itemsArray.length] = 'rcr';
		itemsArray[itemsArray.length] = 'staff';
		itemsArray[itemsArray.length] = 'hedit';
		itemsArray[itemsArray.length] = 'conn_wts';

		itemsArray[itemsArray.length] = 'estaff_lotus.dll';
		itemsArray[itemsArray.length] = 'imod.xfp';

		itemsArray[itemsArray.length] = 'dtx_native_host.exe';
	}

	if ( true )
	{
		CopyFile( FilePath( AppDirectoryPath(), 'SpXml.exe' ), FilePath( FilePath( AppDirectoryPath(), 'Uninstall' ), 'sx_setup.exe' ) );
		itemsArray[itemsArray.length] = 'Uninstall/sx_setup.exe';
	}

	ZipCreate( packagePath, itemsArray, {BaseDir:AppDirectoryPath()} );

	/*
	retVal = ProcessExecute( FilePath( FilePath( AppDirectoryPath(), 'misc' ), 'pkzipc.exe' ), ' -add -rec -path=current "' + packagePath + '" ' + srcFiles, 'wait=1;hidden=1;work-dir=\'' + AppDirectoryPath() + '\'' );
	if ( retVal != 0 )
		throw retVal;
	*/

	clientUpdateDir = FilePath( AppDirectoryPath(), 'UpdateClient' );

	itemsArray = new Array();
	itemsArray[itemsArray.length] = 'SpXml.ini';
	itemsArray[itemsArray.length] = 'SpXml.exe.manifest';

	ZipCreate( packagePath, itemsArray, {BaseDir:clientUpdateDir} );

	return packageUrl;
}


