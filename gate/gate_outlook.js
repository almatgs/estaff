function OnPluginStartup( app )
{
	//if ( app.ActiveExplorer == undefined )
		//return;

	app_ref = app;
}


function DefaultMethod( actionID )
{
	app = app_ref.Object;

	configDoc = FetchDoc( AppConfig.GetProperty( 'GATE-CONFIG' ), 'ui-text=1;form=gate_config.xmd' );
	pluginConfigDoc = FetchDoc( configDoc.TopElem.email_plugin_config_url, 'ui-text=1;form=gate_email_plugin_config.xmd' );

	action = pluginConfigDoc.TopElem.actions.GetOptChildByKey( actionID );
	if ( action == undefined )
	{
		alert( 'No such action: ' + actionID );
		return;
	}

	try
	{
		selection = app.ActiveExplorer.Selection;
	}
	catch ( e )
	{
		alert( UiText.errors.no_message_selected );
		return;
	}

	destDoc = OpenNewDoc( 'x-app://gate/gate_email_plugin_action.xmd' );
	destDoc.TopElem.action_id = action.id;
	destDoc.TopElem.email_app_id = 'outlook';
	
	for ( i = 1; i <= selection.Count; i++ )
	{
		item = selection.Item( i );

		if ( item.MessageClass == 'IPM.Note' || StrBegins( item.MessageClass, 'IPM.Note.' ) )
		{
			if ( action.target_item_type.HasValue && action.target_item_type != 'email_message' )
				continue;

			destItem = destDoc.TopElem.items.AddChild();
			message_item_to_dest_item( item, destItem );
		}
		else if ( item.MessageClass == 'IPM.Appointment' )
		{
			if ( action.target_item_type.HasValue && action.target_item_type != 'calendar_entry' )
				continue;

			destItem = destDoc.TopElem.items.AddChild();
			calendar_item_to_dest_item( item, destItem );
		}

		if ( ! action.allow_multi_select && destDoc.TopElem.items.ChildNum >= 1 )
			break;
	}

	if ( destDoc.TopElem.items.ChildNum == 0 )
	{
		alert( UiText.errors.no_message_selected );
		return;
	}

	tempFileUrl = ObtainTempFile( '.xml' );
	destDoc.SaveToUrl( tempFileUrl );

	appDir = AppDirectoryPath();
	if ( FileName( appDir ) == 'sx_gate' )
		appDir = 'C:\\work\\SpXml';

	appPath = FilePath( appDir, 'SpXml.exe' );

	execParam = '/E "lib_recruit.handle_email_plugin_action( \'' + tempFileUrl + '\' ) "';
	
	ShellExecute( "open", appPath, execParam );
}


function message_item_to_dest_item( item, destitem )
{
	var		i;

	destitem.item_type_id = 'email_message';

	destitem.sender.address = item.SenderEmailAddress;
	destitem.sender.name = item.SenderName;

	destitem.date = item.ReceivedTime;
	destitem.subject = item.Subject;

	destitem.body = item.Body;
	destitem.html_body = item.HtmlBody;

	lib = OpenCodeLib( 'x-app://base1/base1_lib_html.js' );
	destitem.html_body = lib.set_default_meta_charset( destitem.html_body, AppCharset );

	for ( i = 1; i <= item.Attachments.Count; i++ )
	{
		srcAttc = item.Attachments.Item( i );
		//DebugMsg( srcAttc.PropertyAccessor.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x3712001E") );
		attc = destitem.attachments.AddChild();

		attc.file_name = srcAttc.FileName;
		
		tempFileUrl = ObtainTempFile();
		srcAttc.SaveAsFile( UrlToFilePath( tempFileUrl ) )
		attc.data.LoadFromFile( tempFileUrl );
		DeleteFile( tempFileUrl );
	}
}


function calendar_item_to_dest_item( item, destitem )
{
	destitem.item_type_id = 'calendar_entry';
	destitem.id = item.EntryID;

	destitem.date = item.Start;
	destitem.subject = item.Subject;

	destitem.body = item.Body;
	//destitem.html_body = item.HtmlBody;
}
