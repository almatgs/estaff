function allocate_resource_list()
{
	return OpenNewDoc( 'base1_html_resources.xmd' ).TopElem;
}


function generate_resource_id( origUrl )
{
	str = UrlFileName( origUrl );
	if ( StrContains( str, '\\' ) )
		str = FileName( str );

	return str;
}


function load_resources_from_dir_rec( resources, baseDir, baseID, excptID )
{
	for ( filePath in ReadDirectoryByPath( baseDir ) )
	{
		fileName = FileName( filePath );

		if ( baseID != '' )
			id = baseID + '/' + fileName;
		else
			id = fileName;

		if ( excptID != undefined && id == excptID )
			continue;

		if ( IsDirectory( filePath ) )
		{
			load_resources_from_dir_rec( resources, filePath, id, undefined );
			return;
		}

		resource = resources.AddChild();
		resource.id = id;
		resource.data = LoadFileData( filePath );
	}
}


function get_html_meta()
{
	if ( base1_config.is_int_version )
		return '';

	return '<meta http-equiv=\"content-type\" content=\"text/html; charset=windows-1251\"/>';
}


function get_html_src_url( htmlStr )
{
	reader = new TagReader( htmlStr );
	reader.SkipToTag( 'html', '', true );
	return reader.GetAttr( 'x-source-url' );
}


function is_full_html( htmlStr )
{
	return StrContains( htmlStr, '<html' ) || StrContains( htmlStr, '<HTML' );
}


function build_full_html( htmlStr )
{
	if ( htmlStr == '' )
		return '';

	if ( is_full_html( htmlStr ) )
		return htmlStr;

	return '<html>\r\n' + get_html_meta() + '\r\n<body>\r\n' + htmlStr + '\r\n</body></html>';
}


function build_full_html_with_charset( htmlStr, charset )
{
	if ( htmlStr == '' )
		return '';

	return '<html>\r\n' + '<meta http-equiv=\"content-type\" content=\"text/html; charset=' + charset + '\"/>' + '\r\n<body>\r\n' + htmlStr + '\r\n</body></html>';
}


function bind_external_resources( htmlStr, srcUrl, resources )
{
	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );

	while ( true )
	{
		if ( ! reader.ReadNext() )
			break;

		switch ( reader.TagName )
		{
			case '':
				str = reader.Comment;

				if ( StrBegins( str, '[if gte ' ) && StrEnds( str, '<![endif]' ) && StrContains( str, 'src="', true ) )
				{
					pos1 = String( str ).indexOf( ']>' ) + 2;
					pos2 = StrLen( str ) - 9;

					subStr = StrRangePos( str, pos1, pos2 );
					subStr = bind_external_resources( subStr, srcUrl, resources );
					
					str = StrLeftRange( str, pos1 ) + subStr + StrRightRangePos( str, pos2 );
					//alert( subStr );

					destStream.WriteStr( '<!--' + str + '-->' );
					continue;
				}

				break;

			case 'script':
				reader.ReadHtmlGroup();
				break;

			case 'link':
				if ( reader.GetAttr( 'rel' ) != 'stylesheet' )
					break;

				if ( lib_base.url_host_match( UrlHost( srcUrl ), 'hh.ru' ) )
					continue;

				bind_external_tag_attr( reader, 'href', srcUrl, resources );
				break;

			case 'img':
			case 'v:imagedata':
				bind_external_tag_attr( reader, 'src', srcUrl, resources );
				break;
		}
		
		reader.ExportTag( destStream );
	}
	
	return destStream.DetachStr();
}


function bind_external_tag_attr( reader, attrName, srcUrl, resources )
{
	attrValue = reader.GetAttr( attrName );
	if ( attrValue == '' )
		return;

	if ( StrBegins( attrValue, 'data:' ) )
		return;

	if ( ArrayOptFindByKey( resources, attrValue, 'id' ) != undefined )
		return;

	if ( UrlSchema( srcUrl ) == 'file' && ! IsAbsoluteUrlStr( attrValue ) )
	{
	}
	else if ( UrlSchema( srcUrl ) != 'http' && UrlSchema( srcUrl ) != 'https' && ! IsAbsoluteUrlStr( attrValue ) )
	{
		return;
	}

	//attrValue = StrReplace( attrValue, '&amp;', '&' );

	resourceUrl = AbsoluteUrl( attrValue, srcUrl );

	resource = resources.AddChild();

	contentType = '';
	
	//alert( resourceUrl );
	try
	{
		if ( UrlSchema( resourceUrl ) == 'http' || UrlSchema( resourceUrl ) == 'https' )
		{
			resp = HttpRequest( resourceUrl, 'get' );
			
			resource.data = resp.Body;
			contentType = resp.ContentType;
		}
		else if ( UrlSchema( resourceUrl ) == 'file' && UrlHost( resourceUrl ) != '' )
		{
			resource.Delete();
			resource = undefined;
		}
		else
		{
			resource.data = LoadUrlData( resourceUrl );
		}
	}
	catch ( e )
	{
		//DebugMsg( e );
		//alert( resourceUrl );
		resource.Delete();
		resource = undefined;
	}

	if ( resource == undefined )
	{
		reader.SetAttr( attrName, '' );
		return;
	}

	resource.id = generate_resource_id( attrValue );

	if ( contentType != '' && UrlStdContentType( resource.id ) != contentType )
		resource.id = UniqueID() + lib_base.get_content_type_default_file_suffix( contentType );

	reader.SetAttr( attrName, resource.id );
}


function bind_cid_images( htmlStr, message )
{
	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );

	while ( true )
	{
		if ( ! reader.ReadNext() )
			break;

		switch ( reader.TagName )
		{
			case 'img':
			case 'v:imagedata':
				bind_cid_image_tag( reader, message );
				break;
		}
		
		reader.ExportTag( destStream );
	}
	
	return destStream.DetachStr();
}


function bind_cid_image_tag( reader, message )
{
	attrValue = reader.GetAttr( 'src' );
	if ( attrValue == '' )
		return;

	if ( ! StrBegins( attrValue, 'cid:' ) )
		return;

	cid = StrRightRangePos( attrValue, 4 );
	if ( ( pos = cid.indexOf( '@' ) ) >= 0 )
		cid = StrLeftRange( cid, pos );
	
	attachment = message.attachments.GetOptChildByKey( cid, 'file_name' );
	if ( attachment == undefined )
		return;

	contentType = UrlStdContentType( attachment.file_name );
	
	attrValue = 'data:';
	if ( contentType != '' )
		attrValue += contentType + ';';

	attrValue += 'base64,' + Base64Encode( attachment.data );

	reader.SetAttr( 'src', attrValue );

	attachment.Delete();
}


function BindCompoundHtmlImages( htmlStr )
{
	//PutUrlData( 'x-local://Logs/1.htm', htmlStr );

	reader = new TagReader( htmlStr );
	attcArray = new Array;

	while ( reader.ReadNext() )
	{
		if ( reader.TagName == 'compound-attc' )
		{
			attc = new Object;
			attc.path = reader.GetAttr( 'path' );
			attc.data = Base64Decode( reader.GetAttr( 'data' ) );
			
			//PutUrlData( 'x-local://Logs/1.tmp', attc.data );

			attcArray.push( attc );
		}
	}

	if ( attcArray.length == 0 )
		return htmlStr;

	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );

	while ( true )
	{
		if ( ! reader.ReadNext() )
			break;

		if ( reader.TagName == 'compound-attc' )
			continue;

		switch ( reader.TagName )
		{
			case 'img':
			case 'v:imagedata':
				BindCompoundHtmlImageTag( reader, attcArray );
				break;
		}
		
		reader.ExportTag( destStream );
	}
	
	return destStream.DetachStr();
}


function BindCompoundHtmlImageTag( reader, attcArray )
{
	attrValue = reader.GetAttr( 'src' );
	if ( attrValue == '' )
		return;

	if ( StrBegins( attrValue, './' ) )
		attrValue = StrReplaceOne( attrValue, './', '' );

	//DebugMsg( attrValue );

	attc = ArrayOptFindByKey( attcArray, attrValue, 'path' );
	if ( attc == undefined )
		return;

	//DebugMsg( attrValue );

	contentType = UrlStdContentType( attc.path );
	if ( contentType == '' )
		contentType = lib_base.GuessImageContentTypeFromData( attc.data );
	
	attrValue = 'data:';
	attrValue += contentType + ';';

	attrValue += 'base64,' + Base64Encode( attc.data );

	reader.SetAttr( 'src', attrValue );
}


function CompoundHtmlToMailMessageBody( htmlStr, mailMessage )
{
	reader = new TagReader( htmlStr );
	attcArray = new Array;

	while ( reader.ReadNext() )
	{
		if ( reader.TagName == 'compound-attc' )
		{
			attc = new Object;
			attc.path = reader.GetAttr( 'path' );
			attc.data = Base64Decode( reader.GetAttr( 'data' ) );
			attc.cid = '' + UniqueID();
			
			//PutUrlData( 'x-local://Logs/1.tmp', attc.data );

			attcArray.push( attc );
		}
	}

	if ( attcArray.length == 0 )
		return htmlStr;

	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );

	while ( true )
	{
		if ( ! reader.ReadNext() )
			break;

		if ( reader.TagName == 'compound-attc' )
			continue;

		switch ( reader.TagName )
		{
			case 'img':
			case 'v:imagedata':
				CompoundHtmlImageTagToMailMessageBody( reader, attcArray );
				break;
		}
		
		reader.ExportTag( destStream );
	}

	for ( attc in attcArray )
	{
		messageAttc = mailMessage.attachments.AddChild();
		messageAttc.name = 'cid:' + attc.cid;
		messageAttc.data = attc.data;
	}
	
	return destStream.DetachStr();
}


function CompoundHtmlImageTagToMailMessageBody( reader, attcArray )
{
	attrValue = reader.GetAttr( 'src' );
	if ( attrValue == '' )
		return;

	if ( StrBegins( attrValue, './' ) )
		attrValue = StrReplaceOne( attrValue, './', '' );

	//DebugMsg( attrValue );

	attc = ArrayOptFindByKey( attcArray, attrValue, 'path' );
	if ( attc == undefined )
		return;

	//DebugMsg( attrValue );

	contentType = UrlStdContentType( attc.path );
	if ( contentType == '' )
		contentType = lib_base.GuessImageContentTypeFromData( attc.data );
	
	attrValue = 'cid:' + attc.cid;
	reader.SetAttr( 'src', attrValue );
}


function adjust_inline_images( htmlStr )
{
	if ( ! StrContains( htmlStr, '="data:' ) )
		return htmlStr;

	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );
	attcExported = false;

	while ( true )
	{
		if ( ! reader.ReadNext() )
			break;

		switch ( reader.TagName )
		{
			case 'img':
			case 'v:imagedata':
				adjust_tag_inline_image( reader, 'src' );
				break;
		}
		
		reader.ExportTag( destStream );

		if ( reader.TagName == '/body' )
		{
			reader.ExportCompoundAttc( destStream );
			attcExported = true;
		}
	}
	
	if ( ! attcExported )
		reader.ExportCompoundAttc( destStream );

	return destStream.DetachStr();
}


function adjust_tag_inline_image( reader, attrName )
{
	attrValue = reader.GetAttr( attrName );
	if ( attrValue == '' )
		return;

	if ( ! StrBegins( attrValue, 'data:' ) )
		return;

	obj = StrOptScan( attrValue, 'data:%s;base64,%s' );
	if ( obj == undefined )
		return;

	fileName = UniqueID() + ContentTypeToFileNameSuffix( obj[0] );
	reader.RegisterCompoundAttc( fileName, Base64Decode( obj[1] ) );

	reader.SetAttr( attrName, fileName );
}


function is_compound_html( htmlStr )
{
	//PutUrlData( 'z1.htm', htmlStr );

	return StrContains( htmlStr, '<compound-attc ' );
}


function build_compound_html_from_url( url )
{
	htmlStr = LoadUrlData( url );
	htmlStr = adjust_unicode_html( htmlStr );

	resources = allocate_resource_list();

	return make_compound_html( htmlStr, resources );
}


function make_compound_html( htmlStr, resources )
{
	if ( resources == undefined || ArrayCount( resources ) == 0 )
		return htmlStr;

	reader = new TagReader;

	for ( resource in resources )
		reader.RegisterCompoundAttc( resource.id, resource.data );

	destStream = new BufStream;
	reader.ExportCompoundAttc( destStream );

	pos = StrOptSubStrPos( htmlStr, '</html>', true );
	if ( pos == undefined )
		return htmlStr + destStream.DetachStr();
	else
		return StrLeftRange( htmlStr, pos ) + destStream.DetachStr() + StrRightRangePos( htmlStr, pos );
}


function adjust_format( htmlStr )
{
	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );

	while ( reader.ReadNext() )
	{
		if ( reader.TagName == '' )
		{
			reader.ExportTag( destStream );
			continue;
		}

		tagName = StrLowerCase( reader.TagName );

		if ( tagName == 'meta' && StrLowerCase( reader.GetAttr( 'name' ) ) == 'generator' )
			continue;

		if ( StrContains( tagName, ':' ) )
			continue;

		switch ( tagName )
		{
			case 'font':
			case '/font':
			case 'span':
			case '/span':
			case 'u':
			case '/u':
				continue;
		}

		if ( reader.GetAttr( 'class' ) != '' )
			reader.SetAttr( 'class', '' );

		if ( reader.GetAttr( 'style' ) != '' )
			reader.SetAttr( 'style', '' );
		
		reader.ExportTag( destStream );
	}
	
	return destStream.DetachStr();
}


function extract_html_body( htmlStr )
{
	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );
	insideBody = false;
	isUtf = false;

	while ( reader.ReadNext() )
	{
		if ( insideBody )
		{
			if ( reader.TagName == '/body' )
				break;

			reader.ExportTag( destStream );
		}
		else
		{
			if ( reader.TagName == 'meta' && StrLowerCase( reader.GetAttr( 'http-equiv' ) ) == 'content-type' && StrContains( reader.GetAttr( 'content' ), 'utf-8', true ) )
			{
				isUtf = true;
			}

			if ( reader.TagName == 'body' )
				insideBody = true;

			continue;
		}
	}
	
	newHtmlStr = destStream.DetachStr();

	if ( isUtf )
		newHtmlStr = DecodeCharset( newHtmlStr, 'utf-8' );

	return newHtmlStr;
}


function set_meta_charset( htmlStr, charset )
{
	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) + 10 );

	reader = new TagReader( htmlStr );
	metaFound = false;

	while ( reader.ReadNext() )
	{
		if ( ! metaFound && reader.TagName == 'meta' && StrLowerCase( reader.GetAttr( 'http-equiv' ) ) == 'content-type' )
		{
			reader.SetAttr( 'content', 'text/html; charset=' + charset );
			metaFound = true;
		}

		if ( reader.TagName == '/head' && ! metaFound )
			destStream.WriteStr( '<meta http-equiv="content-type" content="text/html; charset=' + charset + '"/>\r\n' );

		reader.ExportTag( destStream );
	}
	
	newHtmlStr = destStream.DetachStr();
	return newHtmlStr;
}


function set_default_meta_charset( htmlStr, charset )
{
	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) + 10 );

	reader = new TagReader( htmlStr );
	metaFound = false;

	while ( reader.ReadNext() )
	{
		if ( ! metaFound && reader.TagName == 'meta' && StrLowerCase( reader.GetAttr( 'http-equiv' ) ) == 'content-type' )
		{
			metaFound = true;
		}

		if ( reader.TagName == '/head' && ! metaFound )
			destStream.WriteStr( '<meta http-equiv="content-type" content="text/html; charset=' + charset + '"/>\r\n' );

		reader.ExportTag( destStream );
	}
	
	newHtmlStr = destStream.DetachStr();
	return newHtmlStr;
}


function add_default_style( htmlStr, styleUrl )
{
	if ( System.IsWebClient )
		return htmlStr;

	if ( htmlStr == '' )
		htmlStr = '<html>\r\n' + get_html_meta() + '\r\n<body></body></html>';
	else
		htmlStr = build_full_html( htmlStr );

	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );

	while ( reader.ReadNext() )
	{
		if ( reader.TagName == 'body' )
			destStream.WriteStr( '<link rel="stylesheet" type="text/css" href="' + styleUrl + '" spxml-default-css="1"/>\r\n' );
		
		reader.ExportTag( destStream );
	}
	
	return destStream.DetachStr();
}


function remove_default_style( htmlStr )
{
	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );

	while ( reader.ReadNext() )
	{
		if ( reader.TagName == 'link' && reader.GetAttr( 'spxml-default-css' ) == '1' )
			continue;
		
		reader.ExportTag( destStream );
	}
	
	return destStream.DetachStr();
}


function compound_html_to_mht( htmlStr )
{
	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) + 200 );

	delim = '------=_NextPart_' + StrHexInt( UniqueID() );

	destStream.WriteStr( 'MIME-Version: 1.0\r\n' );
	destStream.WriteStr( 'Content-Type: multipart/related; type="text/html"; boundary="' + delim + '"\r\n' );
	destStream.WriteStr( '\r\n' );

	destStream.WriteStr( 'This is a multi-part message in MIME format.' );

	destStream.WriteStr( '\r\n' );
	destStream.WriteStr( '--' + delim + '\r\n' );
	destStream.WriteStr( 'Content-Type: text/html\r\n' );
	destStream.WriteStr( 'Content-Location: 1.htm\r\n' );
	destStream.WriteStr( '\r\n' );

	reader = new TagReader( htmlStr );

	isFullHtml = is_full_html( htmlStr );
	if ( ! isFullHtml )
	{
		destStream.WriteStr( '<html>\r\n' );
		destStream.WriteStr( get_html_meta() + '\r\n' );
		destStream.WriteStr( '<body>\r\n' );
	}

	insideAttc = false;

	while ( reader.ReadNext() )
	{
		if ( reader.TagName == 'compound-attc' )
		{
			if ( ! insideAttc )
			{
				if ( ! isFullHtml )
					destStream.WriteStr( '</body>\r\n' );

				destStream.WriteStr( '</html>\r\n' );
				insideAttc = true;
			}

			attcPath = reader.GetAttr( 'path' );

			destStream.WriteStr( '\r\n' );
			destStream.WriteStr( '--' + delim + '\r\n' );
			destStream.WriteStr( 'Content-Type: ' + UrlStdContentType( attcPath ) + '\r\n' );
			destStream.WriteStr( 'Content-Transfer-Encoding: base64\r\n' );
			destStream.WriteStr( 'Content-Location: ' + StrReplace( attcPath, '\\', '/' ) + '\r\n' );
			destStream.WriteStr( '\r\n' );

			destStream.WriteStr( reader.GetAttr( 'data' ) );
		}
		else
		{
			if ( insideAttc )
				continue;

			reader.ExportTag( destStream );
		}
		
	}
	
	destStream.WriteStr( '\r\n' );
	destStream.WriteStr( '--' + delim + '--\r\n' );

	destStr = destStream.DetachStr();

	//PutUrlData( 'z.mht', destStr );
	return destStr;
}


function adjust_unicode_html( htmlStr )
{
	if ( StrBegins( htmlStr, unicode_bom_prefix() ) )
	{
		newHtmlStr = Utf16ToUtf8( StrRightRangePos( htmlStr, 2 ) );

		PutUrlData( 'z_uc.htm', newHtmlStr );
		newHtmlStr = set_meta_charset( newHtmlStr, 'utf-8' );
		
		return newHtmlStr;
	}
	else
	{
		return htmlStr;
	}
}


function unicode_bom_prefix()
{
	return DataFromHex( 'FFFE' );
}


function adjust_to_simple_formatting( htmlStr )
{
	var		insideModListEntry;

	//PutUrlData( 'zz_orig.htm', htmlStr );

	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlStr ) );

	reader = new TagReader( htmlStr );

	insideListEntry = false;
	insideModListEntry = false;
	insideAltCode = false;
	isUtf = false;

	while ( reader.ReadNext() )
	{
		if ( reader.TagName == '' )
		{
			if ( reader.Comment != '' || reader.MiscText != '' )
				continue;

			reader.ExportTag( destStream );
			continue;
		}

		tagName = reader.TagName;

		switch ( tagName )
		{
			case 'html':
			case '/html':
			case 'body':
			case '/body':
			case 'br':
			case 'p':
			case '/p':
			case 'strong':
			case '/strong':
			case 'em':
			case '/em':
			case 'b':
			case '/b':
			case 'i':
			case '/i':
			case 'u':
			case '/u':
			case 'ol':
			case '/ol':
			case 'ul':
			case '/ul':
			case 'li':
			case '/li':
				break;

			case 'meta':
				if ( StrLowerCase( reader.GetAttr( 'http-equiv' ) ) == 'content-type' )
					break;

				continue;

			default:
				continue;
		}

		if ( tagName != 'meta' )
		{
			for ( attrName in reader.AttrNames )
			{
				switch ( attrName )
				{
					case 'align':
						break;
				
					default:
						reader.DeleteOptAttr( attrName );
				}
			}
		}

		reader.ExportTag( destStream );
	}
	
	newHtmlStr = destStream.DetachStr();

	//PutUrlData( 'zz_new.htm', newHtmlStr );

	return newHtmlStr;
}


function plain_text_to_html( textStr )
{
	//PutUrlData( 'zz_orig.txt', textStr );

	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( textStr ) + 100 );

	destStream.WriteStr( '<html>\r\n' );
	destStream.WriteStr( get_html_meta() + '\r\n' );
	destStream.WriteStr( '<body>\r\n' );

	for ( lineStr in StrSplitToLines( textStr ) )
	{
		if ( lineStr != '' )
			destStream.WriteStr( '<p>' + HtmlEncode( lineStr ) + '</p>' );
		else
			destStream.WriteStr( '<br/>' );
	}
	
	destStream.WriteStr( '</body>\r\n' );
	destStream.WriteStr( '<html>\r\n' );

	htmlStr = destStream.DetachStr();

	//PutUrlData( 'zz_new.htm', htmlStr );

	return htmlStr;
}


