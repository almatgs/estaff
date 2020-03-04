function remove_app()
{
	check_deactivate();

	if ( ! Screen.MsgBox( StrReplaceOne( UiText.messages.this_will_uninstall_xxx, '%s', package.full_name ), UiText.messages.warning_msg_title, 'warning', 'yes,no' ) )
		return;
	
	if ( package.sub_id == 'Server' )
		remove_daemon();

	destAppPath = GetSysRegStrValue( 'HKEY_AUTO\\Software\\Datex\\' + package.full_app_id, 'Path', {UseBoth3264Views:true} );
	destBaseDir = ParentDirectory( destAppPath );
	
	for ( item in package.items )
	{
		if ( StrContains( item.name, '_data' ) )
			continue;

		try
		{
			if ( StrEnds( item.src_name, '.zip' ) && ! StrEnds( item.name, '.zip' ) )
			{
				DeleteDirectory( FilePath( destBaseDir, item.name ) );
			}
			else
			{
				DeleteFile( FilePath( destBaseDir, item.name ) );
			}
		}
		catch ( e )
		{
		}
	}
	
	try
	{
		DeleteDirectory( FilePath( destBaseDir, 'Logs' ) );
	}
	catch ( e )
	{
	}
	
	try
	{
		DeleteDirectory( FilePath( destBaseDir, 'RParse' ) );
	}
	catch ( e )
	{
	}

	try
	{
		DeleteDirectory( FilePath( destBaseDir, 'misc' ) );
	}
	catch ( e )
	{
	}

	baseDir = GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders', 'Common Programs' );
	
	try
	{
		DeleteFile( FilePath( baseDir, package.link_name + '.lnk' ) );
	}
	catch ( e )
	{
	}

	baseDir = GetSysRegStrValue( 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders', 'Programs' );
	
	try
	{
		DeleteFile( FilePath( baseDir, package.link_name + '.lnk' ) );
	}
	catch ( e )
	{
	}

	desktopDir = GetSysRegStrValue( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders', 'Common Desktop' );

	try
	{
		DeleteFile( FilePath( desktopDir, package.link_name + '.lnk' ) );
	}
	catch ( e )
	{
	}

	desktopDir = GetSysRegStrValue( 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders', 'Desktop' );

	try
	{
		DeleteFile( FilePath( desktopDir, package.link_name + '.lnk' ) );
	}
	catch ( e )
	{
	}

	try
	{
		//RemoveSysRegKey( 'HKEY_AUTO\\Software\\Microsoft\\Internet Explorer\\Extensions\\{C30C6D7C-68A6-42B5-97B1-80AB1E4DC1AF}' );
	}
	catch ( e )
	{
	}

	try
	{
		RemoveSysRegKey( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\' + package.full_app_id );
	}
	catch ( e )
	{
	}

	try
	{
		RemoveSysRegKey( 'HKEY_LOCAL_MACHINE\\Software\\Datex\\' + package.full_app_id, {UseBoth3264Views:true} );
		RemoveEmptySysRegKey( 'HKEY_LOCAL_MACHINE\\Software\\Datex\\', {UseBoth3264Views:true} );
	}
	catch ( e )
	{
	}

	try
	{
		RemoveSysRegKey( 'HKEY_CURRENT_USER\\Software\\Datex\\' + package.full_app_id );
		RemoveEmptySysRegKey( 'HKEY_CURRENT_USER\\Software\\Datex\\' );
	}
	catch ( e )
	{
	}

	//DeleteDirectory( FilePath( AppDirectoryPath(), 'app' ) );
	//Delete( FilePath( AppDirectoryPath(), 'app' ) );

	Sleep( 300 );
	Screen.MsgBox( StrReplaceOne( UiText.messages.xxx_was_uninstalled, '%s', package.full_name ), UiText.method_status.operation_result, 'info' );
}


function check_deactivate()
{
	if ( ! package.use_sn )
		return;

	if ( GetSysRegStrValue( 'HKEY_AUTO\\Software\\Datex\\' + package.full_app_id, 'ActivationCode', {UseBoth3264Views:true} ) == '' )
		return;

	Screen.MsgBox( UiText.errors.deactivation_required, UiText.titles.error, 'error' );
	Cancel();
}


function remove_daemon()
{
	try
	{
		UnregisterDaemon( package.full_app_id );
	}
	catch ( e )
	{
		alert( e );
	}
}