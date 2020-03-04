function Init( attachment, fileInfo )
{
	this.attachment = attachment;
	this.fileInfo = fileInfo;

	if ( attachment.is_text )
	{
		tempDir = ObtainSessionTempFile();
		CreateDirectory( tempDir );

		file_url = UrlAppendPath( tempDir, '1.htm' );

		if ( attachment.text.HasValue )
			ExtractCompoundHtml( attachment.text, file_url );
		else
			PutUrlData( file_url, '<html></html>' );

		editorProcessName = lib_office.active_editor_process_name;
	}
	else if ( attachment.Name != 'file' && attachment.is_plain_text )
	{
		tempDir = ObtainSessionTempFile();
		CreateDirectory( tempDir );
		file_url = UrlAppendPath( tempDir, '1.txt' );

		attachment.plain_text.SaveToFile( file_url );

		editorProcessName = '';
	}
	else
	{
		tempDir = ObtainSessionTempFile();
		CreateDirectory( tempDir );
		file_url = UrlAppendPath( tempDir, lib_base.adjust_file_name( fileInfo.file_name ) );

		fileInfo.data.SaveToFile( file_url );

		editorProcessName = '';
	}

	file_mod_date = GetFileModDate( file_url );

	if ( editorProcessName == '' )
		ShellExecute( 'open', file_url );
	else
		ShellExecute( 'open', editorProcessName, '"' + file_url + '"' );
}


function LoadNewData( screen )
{
	if ( attachment.is_text )
	{
		attachment.text = BuildCompoundHtml( file_url );
		//attachment.text = lib_html.build_compound_html_from_url( file_url );
	}
	else
	{
		fileInfo.data.LoadFromFile( file_url );
	}

	attachment.Doc.SetChanged( true );
	screen.Update();
}


function Check( screen )
{
	if ( StrEnds( file_url, '.exe', true ) )
		return false;

	if ( file_locked )
	{
		startTicks = GetCurTicks();

		while ( GetCurTicks() - startTicks < 800 )
		{
			if ( FileIsBusy( file_url ) )
				return true;

			Sleep( 100 );
		}

		newModDate = GetFileModDate( file_url );
		if ( newModDate > file_mod_date )
		{
			LoadNewData( screen );
			file_mod_date = newModDate;
		}

		return false;
	}
	else
	{
		if ( FileIsBusy( file_url ) )
		{
			file_locked = true;
		}
		else
		{
			newModDate = GetFileModDate( file_url );
			if ( newModDate > file_mod_date )
			{
				LoadNewData( screen );
				file_mod_date = newModDate;
			}
		}
	}

	return true;
}


function OnClose( screen )
{
	lib_base.ask_warning_to_continue( screen, StrReplace( UiText.messages.attachment_xxx_is_opened_in_external_program, '%s', attachment.name_desc ) );
}
