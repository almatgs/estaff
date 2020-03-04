function load_resume_file( candidate, srcUrl )
{
	resources = undefined;
	resumeText = '';
	attachment = undefined;

	if ( StrEnds( srcUrl, '.txt', true ) )
	{
		resumeText = LoadUrlData( srcUrl );
		resumeContentType = 'text/plain';
	}
	else if ( StrEnds( srcUrl, '.htm', true ) || StrEnds( srcUrl, '.html', true ) )
	{
		resumeText = LoadUrlData( srcUrl );
		resumeText = lib_html.adjust_unicode_html( resumeText );
		resumeContentType = 'text/html';
	}
	else if ( lib_office.is_editor_file_suffix( UrlPathSuffix( srcUrl ) ) )
	{
		resources = lib_html.allocate_resource_list();
		resumeText = lib_office.doc_file_to_html( srcUrl, resources );
		resumeContentType = 'text/html';
	}
	else if ( StrEnds( srcUrl, '.pdf', true ) )
	{
		attachment = candidate.attachments.AddChild();
		attachment.content_type = 'application/binary';
		attachment.file_name = UrlFileName( srcUrl );
		attachment.data.LoadFromFile( srcUrl );

		attachment.build_preview_data();

		resumeText = attachment.plain_text;
		resumeContentType = 'text/plain';
	}
	else
	{
		throw UserError( 'Unsupported file type: ' + UrlPathSuffix( srcUrl ) );
	}
	
	load_resume_text( candidate, srcUrl, resumeText, resumeContentType, resources );

	if ( attachment != undefined && candidate.attachments.ChildNum >= 2 && ( mainAttachment = candidate.attachments.GetOptChildByKey( 'resume', 'type_id' ) ) != undefined )
	{
		mainAttachment.content_type = attachment.content_type;
		mainAttachment.file_name = attachment.file_name;
		mainAttachment.data = attachment.data;

		attachment.Delete();
	}
}


function load_resume_text( candidate, srcUrl, resumeText, resumeContentType, resources )
{
	parse_resume( candidate, srcUrl, resumeText, resumeContentType );

	if ( resources == undefined )
		resources = lib_html.allocate_resource_list();

	if ( resumeContentType == 'text/html' )
	{
		if ( ! lib_html.is_compound_html( resumeText ) )
		{
			if ( UrlSchema( srcUrl ) == 'http' || UrlSchema( srcUrl ) == 'https' || UrlSchema( srcUrl ) == 'file' )
				resumeText = lib_html.bind_external_resources( resumeText, srcUrl, resources );
		}

		//PutUrlData( 'z1.htm', resumeText );
		resumeText = lib_html.make_compound_html( resumeText, resources );
		//PutUrlData( 'z2.htm', resumeText );
	}
	
	if ( ! candidate.PathExists( 'attachments' ) )
		return resumeText;

	if ( candidate.Name == 'resp_candidate' )
		return;

	if ( resumeText != '' )
	{
		attachment = candidate.attachments.AddChild();
		attachment.type_id = 'resume';
		attachment.content_type = resumeContentType;
		
		if ( resumeContentType == 'text/plain' )
			attachment.plain_text = resumeText;
		else
			attachment.text = resumeText;
	}

	lib_recruit.guess_candidate_src_competitor_org( candidate );
}


function parse_resume( candidate, srcUrl, resumeText, resumeContentType )
{
	if ( true )
	{
		parser = new ContentParser;
		parser.MultiCurrency = true;

		if ( global_settings.rparse.start_str.HasValue )
			parser.SetStartMark( global_settings.rparse.start_str );
		
		if ( resumeContentType == 'text/plain' )
			parser.LoadPlainText( resumeText );
		else
			parser.LoadHtml( resumeText );

		parser.ParseResume();

		for ( email in parser.Emails )
		{
			if ( is_non_candidate_email( email ) )
				parser.RemoveEmailBySuffix( email );
		}

		srcElem = OpenDocFromStr( parser.RespXml ).TopElem;
		
		if ( candidate.salary.HasValue )
		{
			srcElem.salary_currency_id.Clear();
		}

		lastname = RValue( candidate.lastname );
		firstname = RValue( candidate.firstname );
		middlename = RValue( candidate.middlename );

		if ( ! candidate.mobile_phone.HasValue )
			candidate.mobile_phone = lib_phone_details.PhoneToStoredPhone( srcElem.mobile_phone );

		//if ( ! candidate.home_phone.HasValue )
			//candidate.home_phone = lib_phone_details.PhoneToStoredPhone( srcElem.home_phone );

		//if ( ! candidate.work_phone.HasValue )
			//candidate.work_phone = lib_phone_details.PhoneToStoredPhone( srcElem.work_phone );

		candidate.AssignExtraElem( srcElem );

		//alert( candidate.resume_rating );

		if ( lastname != '' || firstname != '' || middlename != '' )
		{
			candidate.lastname = lastname;
			candidate.firstname = firstname;
			candidate.middlename = middlename;
		}

		//if ( srcElem.salary.HasValue )
			//candidate.salary_currency_id = srcElem.salary_currency_id;
	}

	if ( StrLen( resumeText ) < ( resumeContentType == 'text/plain' ? 32 * 1024 : 150 * 1024 ) )
	{
		parser2 = lib_cproc.create_content_parser();

		if ( resumeContentType == 'text/plain' )
			parser2.load_text( resumeText );
		else
			parser2.load_text( HtmlToPlainText( resumeText ) );

		person2 = CreateElem( '//rcr/rcr_candidate.xmd', 'candidate' );
		lib_person_details.parse_person_details( parser2, person2 );

		if ( ! candidate.skype.HasValue )
			candidate.skype = person2.skype;

		if ( ! candidate.citizenship_id.HasValue )
			candidate.citizenship_id = person2.citizenship_id;
	}

	//if ( lib_base.build_simple_ft_phone( candidate.home_phone

	if ( candidate.location_id.HasValue && GetOptForeignElem( locations, candidate.location_id ) == undefined )
		candidate.location_id.Clear();

	adjust_candidate_salary( candidate );

	guess_candidate_location( candidate );
	
	if ( false )
	{
		if ( ! candidate.location_id.HasValue )
			candidate.location_id = global_settings.default_location_id;
	}

	guess_candidate_source_by_url( candidate, srcUrl );
	
	if ( resumeContentType == 'text/plain' )
		guess_candidate_source_by_text( candidate, resumeText );
	else if ( resumeContentType == 'text/html' )
		guess_candidate_source_by_text( candidate, HtmlToPlainText( resumeText ) );
}


function adjust_candidate_salary( candidate )
{
	if ( candidate.salary == null )
		return;

	if ( global_settings.use_multi_currencies.candidate_salary )
	{
		if ( ! candidate.salary_currency_id.HasValue )
			candidate.salary_currency_id = global_settings.default_currency_id;

		if ( ( currency = candidate.salary_currency_id.OptForeignElem ) == undefined || ! currency.is_active )
		{
			candidate.salary = lib_currency.convert_amount( candidate.salary, candidate.salary_currency_id, global_settings.default_currency_id );
			candidate.salary_currency_id = global_settings.default_currency_id;
		}
	}
	else
	{
		if ( candidate.salary_currency_id.HasValue )
		{
			candidate.salary = lib_currency.convert_amount( candidate.salary, candidate.salary_currency_id, global_settings.default_currency_id );
			candidate.salary_currency_id.Clear();
		}
	}
}


function guess_candidate_location( candidate )
{
	if ( candidate.location_id.HasValue )
		return;

	if ( candidate.address == '' )
		return;

	for ( location in locations )
	{
		if ( location.name == '' )
			continue;

		if ( StrContains( candidate.address, location.name, true ) )
		{
			candidate.location_id = location.id;
			break;
		}
	}
}


function guess_candidate_source_by_url( candidate, url )
{
	if ( url == '' )
		return;

	if ( ! StrBegins( url, 'http:' ) && ! StrBegins( url, 'https:' ) )
		return;

	source = lib_recruit.get_opt_candidate_source_by_url( UrlHost( url ) );
	if ( source == undefined )
		return;

	candidate.source_id = source.id;
	lib_voc.update_idata_by_voc( candidate.source_id );
}


function guess_candidate_source_by_text( candidate, srcText )
{
	//if ( ! candidate.ChildExists( 'source_id' ) )
		//return;

	if ( srcText == '' )
		return;

	for ( inetSite in candidate_sources )
	{
		if ( inetSite.is_site && lib_base.str_contains_url_host( srcText, inetSite.name ) )
		{
			match = true;
		}
		else
		{
			match = false;

			for ( keyword in inetSite.keywords )
			{
				if ( lib_base.str_contains_url_host( srcText, keyword ) )
				{
					match = true;
					break;
				}
			}
		}

		if ( match )
		{
			candidate.source_id = inetSite.id;
			lib_voc.update_idata_by_voc( candidate.source_id );
			return;
		}
	}
}


function email_matches_inet_sites( email )
{
	for ( inetSite in candidate_sources )
	{
		if ( inetSite.is_site && lib_base.email_matches_domain_ext( email, inetSite.id ) )
			return true;

		for ( keyword in inetSite.keywords )
		{
			if ( lib_base.email_matches_domain_ext( email, keyword ) )
				return true;
		}
	}

	return false;
}


function is_non_candidate_email( email )
{
	if ( ! StrContains( email, '@' ) )
		return true;

	return lib_base.email_matches_our_domain( email ) || email_matches_inet_sites( email );
}


