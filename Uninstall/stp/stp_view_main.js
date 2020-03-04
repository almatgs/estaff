function OnInit()
{
	this.is_silent = ( GetCommandLineArgs().indexOf( "/quiet" ) >= 0 );
	//alert( this.is_silent );

	stage = stages.AddChild();
	stage.id = 'init';

	if ( package.sub_id == 'Server' )
	{
		stage = stages.AddChild();
		stage.id = 'instance';
	}

	if ( FilePathExists( UrlToFilePath( 'license.txt' ) ) )
	{
		stage = stages.AddChild();
		stage.id = 'license';
	}

	if ( package.use_sn )
	{
		stage = stages.AddChild();
		stage.id = 'sn';
	}

	stage = stages.AddChild();
	stage.id = 'dest_dir';

	if ( package.sub_id != 'Server' )
	{
		stage = stages.AddChild();
		stage.id = 'plugins';

		set_init_plugin_flags();
	}

	stage = stages.AddChild();
	stage.id = 'progress';

	stage = stages.AddChild();
	stage.id = 'finish';

	if ( FilePathExists( UrlToFilePath( 'license.txt' ) ) )
		license.text = LoadUrlData( 'license.txt' );

	instance_id = package.full_app_id;
	instance_link_name = package.link_name;

	if ( package.sub_id == 'Server' )
	{
		firstInstanceSuffix = ArrayOptFirstElem( get_installed_instance_suffixes() );
		if ( firstInstanceSuffix != undefined )
		{
			instance_suffix = firstInstanceSuffix;

			if ( ! SysRegKeyExists( 'HKEY_AUTO\\Software\\Datex\\' + instance_id ) )
				use_named_instance = true;
		}
	}

	if ( package.sub_id != 'Server' )
		init_dest();

	if ( this.is_silent )
	{
		SetAppSilentMode();

		tempDir = ParentDirectory( ParentDirectory( UrlToFilePath( ObtainTempFile() ) ) );
		logFilePath = FilePath( tempDir, package.app_id + '_Setup.log' );
		//DebugMsg( logFilePath );

		err = undefined;

		try
		{
			RunSilentInstall();
		}
		catch ( e )
		{
			err = e;
		}

		if ( err != undefined )
		{
			//InitAppConsole();
			//LogEvent( '', err );
			PutFileData( logFilePath, err );
			throw err;
		}
		
		PutFileData( logFilePath, 'Application has been installed successfully' );
		Cancel();
	}
}


function RunSilentInstall()
{
	for ( cur_stage_index = 0; cur_stage_index < stages.ChildNum; cur_stage_index++ )
	{
		stage = stages[cur_stage_index];
		
		check_cur_stage();
		
		if ( stage.id == 'progress' )
		{
			start_progress();
			
			for ( item in package.items )
				process_item( item );

			finish();
		}
	}
}


function check_cur_stage()
{
	if ( cur_stage.id == 'instance' )
	{
		if ( ! instance_suffix.HasValue )
			use_named_instance = false;

		if ( use_named_instance )
		{
			if ( instance_suffix.HasValue )
				instance_id += '_' + instance_suffix;

			if ( instance_suffix.HasValue )
				instance_link_name += ' ' + instance_suffix;
		}

		init_dest();
	}
	else if ( cur_stage.id == 'sn' )
	{
		sn = sn1 + '-' + sn2 + '-' + sn3;
		sn = StrUpperCase( sn );

		try
		{
			limit = MntAction( 3, sn );
		}
		catch ( e )
		{
			throw UserError( UiText.errors.invalid_sn );
		}

		if ( package.app_id == 'EStaff' && MntAction( 4, sn ) < package.version )
			throw UserError( UiText.errors.invalid_sn_for_this_version );

		if ( ( package.sub_id == 'Server' && limit == 0 ) || ( package.sub_id != 'Server' && limit != 0 ) )
			throw UserError( UiText.errors.invalid_sn_for_this_usage );

		SetSysRegStrValue( 'HKEY_AUTO\\Software\\Datex\\' + instance_id, 'Sn', sn, {Prefer64View:true} );

		if ( System.IsX64 && GetSysRegStrValue( 'HKEY_AUTO\\Software\\Datex\\' + instance_id, 'Sn', {Prefer32View:true} ) != '' )
		SetSysRegStrValue( 'HKEY_AUTO\\Software\\Datex\\' + instance_id, 'Sn', sn, {Prefer32View:true} );

		if ( prev_sn.HasValue && sn != prev_sn )
		{
		sn_changed = true;
		need_start_daemon = false;
		}
	}
	else if ( cur_stage.id == 'dest_dir' )
	{
	if ( ! IsDirectory( dest_dir ) && ! IsDirectory( parentDir = ParentDirectory( dest_dir ) ) )
	{
	Screen.MsgBox( StrReplace( UiText.errors.directory_xxx_does_not_exist, '%s', parentDir ), UiText.titles.error, 'error' );
	Cancel();
	}
	}
}


function start_progress()
{
	if ( package.sub_id == 'Server' )
		check_running_daemon();
			
	if ( false && System.IsX64 )
		dest_app_path = FilePath( dest_dir, 'SpXml_x64.exe' );
	else
		dest_app_path = FilePath( dest_dir, 'SpXml.exe' );

	SetSysRegStrValue( 'HKEY_AUTO\\Software\\Datex\\' + instance_id, 'Path', dest_app_path, {Prefer64View:true} );

	if ( System.IsX64 && GetSysRegStrValue( 'HKEY_AUTO\\Software\\Datex\\' + instance_id, 'Path', {Prefer32View:true} ) != '' )
		SetSysRegStrValue( 'HKEY_AUTO\\Software\\Datex\\' + instance_id, 'Path', dest_app_path, {Prefer32View:true} );

	src_dir = AppDirectoryPath();


	isNew = ( ! PathIsDirectory( dest_dir ) );
	ObtainDirectory( dest_dir );

	if ( isNew )
	{
		try
		{
			SetFileAccess( dest_dir, 'std-users-access=full' );
		}
		catch ( e )
		{
			ActiveScreen.MsgBox( 'Unable to set setup folder permissions\r\n\r\n' + ExtractUserError( e ), UiText.titles.warning, 'warning' );
		}
	}


	processed_items_num = 0;
}


function timer_action()
{
	/*if ( cur_stage.id == 'sn' )
	{
		edit = Screen.FocusItem;
		if ( edit.Type != 'EDIT' )
			return;

		if ( StrLen( edit.Text ) != 4 )
			return;

		if ( edit.Source === sn1 )
		{
			Screen.FinsItemBySource( sn2 ).SetFocus( true );
		}
		else if ( edit.Source === sn2 )
		{
			Screen.FinsItemBySource( sn3 ).SetFocus( true );
		}

		return;
	}*/


	if ( cur_stage.id != 'progress' )
		return;

	if ( processed_items_num >= package.items.ChildNum )
	{
		cur_stage_index++;
		finish();
		Screen.Update();
		return;
	}

	try
	{
		process_item( package.items[processed_items_num] );
	}
	catch ( e )
	{
		Screen.MsgBox( e, UiText.titles.error, 'error' );
		quit();
		//throw e;
	}

	processed_items_num++;

	Screen.Update();
}


function process_item( item )
{
	destPath = FilePath( dest_dir, item.name );
	ObtainDirectory( ParentDirectory( destPath ) );

	if ( StrEnds( item.src_name, '.zip' ) && ! StrEnds( item.name, '.zip' ) )
	{
		ZipExtract( FilePath( src_dir, item.src_name ), destPath );
	}
	else
	{
		if ( ( FileName( item.name ) == 'datex_gate.dll' || FileName( item.name ) == 'datex_gate_x64.dll' ) && FilePathExists( destPath ) && FileIsBusy( destPath ) )
		{
			oldLibFilePath = FilePath( dest_dir, 'date_gate_OLD.dll' );

			if ( FilePathExists( oldLibFilePath ) )
				DeleteFile( oldLibFilePath );

			MoveFile( destPath, oldLibFilePath );
		}

		if ( FileName( item.name ) == 'dtx_native_host.exe' && FilePathExists( destPath ) && FileIsBusy( destPath ) )
		{
			oldLibFilePath = FilePath( dest_dir, 'dtx_native_host_OLD.exe' );

			if ( FilePathExists( oldLibFilePath ) )
				DeleteFile( oldLibFilePath );

			MoveFile( destPath, oldLibFilePath );
		}

		if ( this.is_silent )
		{
			//DebugMsg( FilePath( src_dir, FileName( ( item.src_name.HasValue ? item.src_name : item.name ) ) ) + '--' + destPath );
			CopyFile( FilePath( src_dir, FileName( ( item.src_name.HasValue ? item.src_name : item.name ) ) ), destPath );
		}
		else
		{
			//try
			//{
				CopyFile( FilePath( src_dir, FileName( ( item.src_name.HasValue ? item.src_name : item.name ) ) ), destPath );
			//}
			//catch ( e )
			//{
				//throw ( UiError( StrReplace( UiText.errors.unable_to_copy_file_to_xxx, '%s', destPath ) + '\r\n' + e ) );
				//Screen.ShowErrorMsg( UserError( StrReplace( UiText.errors.unable_to_copy_file_to_xxx, '%s', destPath ), e ) );
				//Cancel();
			//}
		}

		if ( package.sub_id == 'Server' && use_named_instance )
		{
			if ( FileName( item.name ) == 'xHttp.ini' )
				adjust_instance_file_1( FilePath( dest_dir, 'xHttp.ini' ) );
			else if ( FileName( item.name ) == 'SpXml.ini' )
				adjust_instance_file_2( FilePath( dest_dir, 'SpXml.ini' ) );
		}
	}
}


function finish()
{
	if ( package.sub_id == 'Server' )
	{
		try
		{
			RegisterWebsoftUtils();
		}
		catch ( e )
		{
			alert( e );
		}
		
		//if ( use_named_instance )
			//adjust_instance_files();

		register_daemon();
	}

	baseDir = GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders', 'Common Programs' );
	baseDir2 = GetSysRegStrValue( 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders', 'Programs' );

	create_links( baseDir, baseDir2 );

	desktopDir = GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders', 'Common Desktop' );
	desktopDir2 = GetSysRegStrValue( 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders', 'Desktop' );

	create_links( desktopDir, desktopDir2 );

	try
	{
		prepare_uninstall();
	}
	catch ( e )
	{
		alert( e );
	}

	if ( package.sub_id != 'Server' )
	{
		register_plugins();
	}

	launch_app = ( is_new || sn_changed );

	if ( package.sub_id == 'Server' )
		check_start_daemon();
}


function prepare_uninstall()
{
	remDir = FilePath( dest_dir, 'Uninstall' );
	remAppPath = FilePath( remDir, 'SpXml.exe' );
	ObtainDirectory( remDir );

	CopyFile( FilePath( AppDirectoryPath(), 'SpXml.exe' ), remAppPath );
	CopyFile( FilePath( AppDirectoryPath(), 'SpXml.exe.manifest' ), remAppPath + '.manifest' );

	configStr = 'HOME: x-local://stp/stp_view_remove.xml';
	PutUrlData( FilePathToUrl( FilePath( remDir, 'SpXml.ini' ) ), configStr );

	ZipExtract( FilePath( src_dir, 'app.zip' ), FilePath( remDir, 'app' ) );
	ZipExtract( FilePath( src_dir, 'stp.zip' ), FilePath( remDir, 'stp' ) );

	DeleteFile( FilePath( FilePath( remDir, 'stp' ), 'package.xml' ) );
	CopyFile( FilePath( AppDirectoryPath(), 'package.xml' ), FilePath( FilePath( remDir, 'stp' ), 'package.xml' ) );

	if ( package.sub_id == 'Server' && use_named_instance )
		adjust_instance_package_file( FilePath( FilePath( remDir, 'stp' ), 'package.xml' ) );

	regKey = 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\' + instance_id;

	SetSysRegStrValue( regKey, 'DisplayName', instance_link_name );
	SetSysRegStrValue( regKey, 'DisplayIcon', FilePath( dest_dir, package.icon ) );
	SetSysRegStrValue( regKey, 'UninstallString', '"' + remAppPath + '"' );
	SetSysRegStrValue( regKey, 'InstallLocation', dest_dir );
	SetSysRegStrValue( regKey, 'Publisher', 'Datex Software' );
	SetSysRegStrValue( regKey, 'URLInfoAbout', package.info_web );
	SetSysRegIntegerValue( regKey, 'NoModify', 1 );
	SetSysRegIntegerValue( regKey, 'NoRepair', 1 );
}


function quit()
{
	MainScreen.RunCommand( 'Quit' );
}


function init_dest()
{
	destPath = GetSysRegStrValue( 'HKEY_AUTO\\Software\\Datex\\' + instance_id, 'Path', {UseBoth3264Views:true} );
	if ( destPath != '' )
	{
		is_new = false;
		dest_dir = ParentDirectory( destPath );
	}
	else
	{
		is_new = true;
		dest_dir = FilePath( GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion', 'ProgramFilesDir', {Prefer64View:true} ), instance_id );
	}

	if ( package.sub_id == 'Server' && use_named_instance )
	{
		if ( is_new )
		{
			instance_port = 9001 + ArrayCount( get_installed_instance_suffixes() );
		}
		else
		{
			instance_port = get_port_from_ini_file( FilePath( dest_dir, 'xHttp.ini' ) );
		}
	}

	sn = GetSysRegStrValue( 'HKEY_CURRENT_USER\\Software\\Datex\\' + instance_id, 'Sn', {UseBoth3264Views:true} );
	if ( sn == '' )
		sn = GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\Software\\Datex\\' + instance_id, 'Sn', {UseBoth3264Views:true} );
	if ( StrLen( sn ) == 14 )
	{
		try
		{
			obj = StrScan( sn, '%s-%s-%s' );
		}
		catch ( e )
		{
			obj = undefined;
		}

		if ( obj != undefined )
		{
			sn1 = obj[0];
			sn2 = obj[1];
			sn3 = obj[2];
		}
	}

	prev_sn = sn;
}


function check_running_daemon()
{
	try
	{
		daemonState = DaemonGetState( instance_id );
	}
	catch ( e )
	{
		//alert( e );
		return;
	}

	if ( daemonState == 0 )
		return;

	if ( daemonState == 1 )
		need_start_daemon = true;

	DaemonStop( instance_id );
	startTicks = GetCurTicks();

	while ( true )
	{
		if ( DaemonGetState( instance_id ) == 0 )
			break;

		if ( GetCurTicks() - startTicks > 20000 )
			break;

		Sleep( 500 );
	}

	Sleep( 1000 );
}


function register_daemon()
{
	if ( System.IsX64 )
		daemonFilePath = FilePath( dest_dir, 'xHttp_x64.exe' );
	else
		daemonFilePath = FilePath( dest_dir, 'xHttp.exe' );

	RegisterDaemon( instance_id, instance_link_name, daemonFilePath );
}


function check_start_daemon()
{
	if ( need_start_daemon )
		DaemonStart( instance_id );
}


function adjust_instance_files()
{
	adjust_instance_file_1( FilePath( dest_dir, 'xHttp.ini' ) );
	adjust_instance_file_2( FilePath( dest_dir, 'SpXml.ini' ) );
}


function adjust_instance_file_1( filePath )
{
	str = LoadFileData( filePath );

	if ( ! StrContains( str, instance_id ) )
		str = StrReplaceOne( str, package.full_app_id, instance_id );

	if ( instance_port.HasValue )
	{
		if ( ! StrContains( str, 'PORT: ' ) )
			str += 'PORT: ' + instance_port + '\r\n';
	}

	PutFileData( filePath, str );
}


function adjust_instance_file_2( filePath )
{
	str = LoadFileData( filePath );

	if ( ! StrContains( str, instance_id ) )
		str = StrReplaceOne( str, package.full_app_id, instance_id );

	if ( ! StrContains( str, instance_link_name ) )
		str = StrReplaceOne( str, package.link_name, instance_link_name );

	PutFileData( filePath, str );
}


function adjust_instance_package_file( filePath )
{
	doc = OpenDoc( FilePathToUrl( filePath ) );
	doc.TopElem.full_app_id = instance_id;
	doc.TopElem.link_name = instance_link_name;
	doc.Save();
}


function get_port_from_ini_file( filePath )
{
	try
	{
		obj = ParseConfig( LoadFileData( filePath ) );
	}
	catch ( e )
	{
		alert( e );
		return null;
	}

	return OptInt( obj.GetOptProperty( 'PORT' ), null );
}


function create_links( baseDir, baseDir2 )
{
	if ( package.sub_id == 'Server' )
		iconPath = '';
	else
		iconPath = FilePath( dest_dir, package.icon );

	isUserInstall = false;

	try
	{
		CreateShellLink( FilePath( baseDir, instance_link_name ), dest_app_path, '', iconPath );
	}
	catch ( e )
	{
		CreateShellLink( FilePath( baseDir2, instance_link_name ), dest_app_path, '', iconPath );
		isUserInstall = true;
	}

	if ( ! isUserInstall )
	{
		try
		{
			DeleteFile( FilePath( baseDir2, instance_link_name + '.lnk' ), dest_app_path, '', iconPath );
		}
		catch ( e )
		{
		}
	}
	
	if ( package.sub_id == 'Server' && package.app_id == 'EStaff' )
	{
		try
		{
			DeleteFile( FilePath( baseDir, 'Сервер E-Staff.lnk' ) );
		}
		catch ( e )
		{
		}

		try
		{
			DeleteFile( FilePath( baseDir2, 'Сервер E-Staff.lnk' ) );
		}
		catch ( e )
		{
		}
	}
}


function get_installed_instance_suffixes()
{
	strArray = new Array();

	if ( ! SysRegKeyExists( 'HKEY_LOCAL_MACHINE\\Software\\Datex', {Prefer64View:true} ) )
		return strArray;

	for ( instanceName in GetSysRegKeyChildNames( 'HKEY_LOCAL_MACHINE\\Software\\Datex', {Prefer64View:true} ) )
	{
		if ( StrBegins( instanceName, package.full_app_id + '_' ) )
		{
			strArray.push( StrRightRangePos( instanceName, StrLen( package.full_app_id ) + 1 ) );
		}
	}

	return strArray;
}


function check_instance_suffix( elemName )
{
	for ( i = 0; i < StrLen( elemName ); i++ )
	{
		char = StrRangePos( elemName, i, i + 1 );

		if ( ( char >= 'a' && char <= 'z' ) || ( char >= 'A' && char <= 'Z' ) || ( char >= '0' && char <= '9' ) )
		{
		}
		else
		{
			throw UserError( UiText.errors.invalid_char_in_name );
		}
	}
}


function set_init_plugin_flags()
{
	FetchAppModule( 'base1' );
	FetchAppModule( 'chrome' );
	FetchAppModule( 'firefox' );
	FetchAppModule( 'gate' );
	FetchAppModule( 'lotus' );
	FetchAppModule( 'outlook' );
	FetchAppModule( 'thunderbird' );

	sel_plugins.ie = true;
	sel_plugins.firefox = lib_firefox.is_firefox_installed();
	sel_plugins.chrome = lib_chrome.is_chrome_installed();

	sel_plugins.outlook = lib_outlook.is_outlook_installed();
	sel_plugins.thunderbird = lib_thunderbird.is_thunderbird_installed();
	sel_plugins.lotus = lib_lotus.is_lotus_installed();
}


function register_plugins()
{
	base1_config.app_setup_dir = dest_dir;

	lib_base.register_url_handler( true );

	/*if ( package.sub_id != 'Server' && package.items.GetOptChildByKey( 'datex_gate.dll', 'name' ) != undefined )
	{
		try
		{
			ProcessExecute( 'regsvr32.exe', '/s "' + FilePath( dest_dir, 'datex_gate.dll' ) + '"', 'sys=1;wait=1;' );
		}
		catch ( e )
		{
			ActiveScreen.MsgBox( 'Unable to register datex_gate.dll.\r\n\r\n' + ExtractUserError( e ), UiText.titles.error, 'warning' );
		}
	}*/

	if ( sel_plugins.ie )
	{
		try
		{
			lib_base.register_explorer_plugin();
		}
		catch ( e )
		{
			ActiveScreen.MsgBox( 'Unable to register IE plugin.\r\n\r\n' + ExtractUserError( e ), UiText.titles.error, 'warning' );
		}
	}

	if ( sel_plugins.firefox )
	{
		try
		{
			lib_firefox.register_firefox_plugin();
		}
		catch ( e )
		{
			ActiveScreen.MsgBox( 'Unable to register Firefox plugin.\r\n\r\n' + ExtractUserError( e ), UiText.titles.error, 'warning' );
		}
	}

	if ( sel_plugins.chrome )
	{
		try
		{
			if ( lib_chrome.is_chrome_plugin_registered() )
				lib_chrome.register_native_host( false );
			else
				lib_chrome.register_chrome_plugin();
		}
		catch ( e )
		{
			ActiveScreen.MsgBox( 'Unable to register Chrome plugin.\r\n\r\n' + ExtractUserError( e ), UiText.titles.error, 'warning' );
		}
	}

	if ( sel_plugins.outlook )
	{
		try
		{
			lib_outlook.register_outlook_plugin();
		}
		catch ( e )
		{
			ActiveScreen.MsgBox( 'Unable to register Outlook plugin.\r\n\r\n' + ExtractUserError( e ), UiText.titles.error, 'warning' );
		}
	}

	if ( sel_plugins.thunderbird )
	{
		try
		{
			lib_thunderbird.register_thunderbird_plugin();
		}
		catch ( e )
		{
			ActiveScreen.MsgBox( 'Unable to register Thunderbird plugin.\r\n\r\n' + ExtractUserError( e ), UiText.titles.error, 'warning' );
		}
	}

	if ( sel_plugins.lotus )
	{
		try
		{
			lib_lotus.register_lotus_plugin();
		}
		catch ( e )
		{
			ActiveScreen.MsgBox( 'Unable to register Lotus Notes plugin.\r\n\r\n' + ExtractUserError( e ), UiText.titles.error, 'warning' );
		}
	}
}


function RegisterWebsoftUtils()
{
	srcBaseDir = FilePath( dest_dir, 'misc/websoft_utils' );

	RegisterAssembly2( FilePath( srcBaseDir, 'Aspose.Pdf.dll' ), srcBaseDir );
	RegisterAssembly2( FilePath( srcBaseDir, 'Aspose.Words.dll' ), srcBaseDir );

	RegisterAssembly( FilePath( srcBaseDir, 'Websoft.Office.Pdf.dll' ) );
	RegisterAssembly( FilePath( srcBaseDir, 'Websoft.Office.Word.dll' ) );
}


function RegisterAssembly( filePath )
{
	exePath = FilePath( GetSysEnvironmentVariable( 'windir' ), 'microsoft.net\\Framework\\v4.0.30319\\regasm.exe' );

	commandLine = '"' + filePath + '"';
	commandLine += ' /codebase';

	ProcessExecute( exePath, commandLine, 'wait=1;hidden=1;exitCodeException=1;stdErr=1;' );


	exePath = FilePath( GetSysEnvironmentVariable( 'windir' ), 'microsoft.net\\Framework64\\v4.0.30319\\regasm.exe' );

	commandLine = '"' + filePath + '"';
	commandLine += ' /codebase';

	ProcessExecute( exePath, commandLine, 'wait=1;hidden=1;exitCodeException=1;stdErr=1;' );
}


function RegisterAssembly2( filePath, srcBaseDir )
{
	exePath = FilePath( srcBaseDir, 'gacutil.exe' );

	commandLine = ' /u';
	commandLine += '"' + filePath + '"';
	commandLine += ' /f';

	ProcessExecute( exePath, commandLine, 'wait=1;hidden=1;exitCodeException=1;stdErr=1;' );
}