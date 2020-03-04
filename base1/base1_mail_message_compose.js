function handle_send()
{
	options = new Object;
	if ( this.message.draft_url.HasValue )
		options.DraftMessageUrl = this.message.draft_url;
	
	lib_mail.send_mail_message( message, options );
	Screen.Close();
}


function handle_open_attachment( attachment )
{
	if ( System.IsWebClient )
	{
		respInfo = CallServerMethod( 'lib_mail', 'SaveDraftMailMessageAttachmentToTempUrl', [this.message.draft_url, attachment.id] );
		tempUrl = respInfo.temp_url;
	}
	else
	{
		tempUrl = ObtainSessionTempFile( UrlPathSuffix( attachment.name ) );
		attachment.data.SaveToFile( tempUrl );
	}

	ShellExecute( 'open', tempUrl );
}


function handle_delete_attachment( attachment )
{
	attachment.Delete();

	if ( System.IsWebClient )
	{
		CallServerMethod( 'lib_mail', 'DeleteDraftMailMessageAttachment', [this.message.draft_url, attachment.id] );
	}
}


function handle_attach_file()
{
	fileUrl = Screen.AskFileOpen();

	attachment = message.attachments.AddChild();
	
	if ( System.IsWebClient )
	{
		respInfo = CallServerMethod( 'lib_mail', 'LoadDraftMailMessageAttachment', [this.message.draft_url, fileUrl] );
		if ( ! this.message.draft_url.HasValue )
			this.message.draft_url = respInfo.message.draft_url;

		attachment.id = respInfo.attachment_id;
	}
	else
	{
		attachment.data.LoadFromFile( fileUrl );
	}

	attachment.name = UrlFileName( fileUrl );
}