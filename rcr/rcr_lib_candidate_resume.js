function BuildInetResume( candidate, auxData, srcResume )
{
	useMsWord = true;
	if ( useMsWord )
		reader = new TagReader();
	
	destStream = new BufStream;
	destStream.PrepareWriteSpace( 6 * 1024 );

	destStream.WriteStr( '<html>\r\n' );
	destStream.WriteStr( '<head>\r\n' );
	destStream.WriteStr( '<meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\"/>\r\n' );
	destStream.WriteStr( '<title></title>\r\n' );
	destStream.WriteStr( '<style>\r\n' );
	destStream.WriteStr( '<!--\r\n' );
	destStream.WriteStr( LoadUrlText( '//rws/rws_inet_resume.css' ) );
	destStream.WriteStr( '-->\r\n' );
	destStream.WriteStr( '</style>\r\n' );
	destStream.WriteStr( '</head>\r\n' );
	
	destStream.WriteStr( '<body>\r\n' );

	
	destStream.WriteStr( '<table><colgroup><col/><col/></colgroup>' );
	destStream.WriteStr( '<tr><td width="100%">' );

	WriteResumeElem( destStream, 'h1', 'EStaffResumeFullname', candidate.lastname + ' ' + candidate.firstname + ' ' + candidate.middlename );
	WriteResumeElem( destStream, 'p', 'EStaffResumeTitle', candidate.desired_position_name );
	
	if ( candidate.birth_date.HasValue || candidate.birth_year.HasValue )
	{
		destStream.WriteStr( '<p>' );

		if ( candidate.birth_date.HasValue )
			WriteResumeElem( destStream, 'span', 'EStaffResumeBirthDate', StrDate( candidate.birth_date, false ) + ' г.р. ' );
		else if ( candidate.birth_year.HasValue )
			WriteResumeElem( destStream, 'span', 'EStaffResumeBirthDate', candidate.birth_year + ' г.р. ' );

		try
		{
			age = lib_base.GetPersonAge( candidate );
		}
		catch ( e )
		{
			age = undefined;
		}

		if ( age != undefined )
			WriteResumeElem( destStream, 'span', 'EStaffResumeAge', '(' + age + ' ' + IntModSelector( age, UiText.titles.years__mod ) + ')' );

		destStream.WriteStr( '</p>' );
	}

	destStream.WriteStr( '<p class="EStaffResumePersonalInfo">' );
	if ( candidate.ChildExists( 'location_name' ) && candidate.location_name.HasValue )
		WriteResumeElem( destStream, 'span', 'EStaffResumeLocation', ' ' + candidate.location_name );
	else
		WriteResumeElem( destStream, 'span', 'EStaffResumeLocation', ' ' + candidate.location_id.ForeignElem.name );
	if ( candidate.metro_station_id.HasValue )
	{
		destStream.WriteStr( ' &nbsp;&nbsp;&nbsp;' );
		WriteResumeElem( destStream, 'span', 'EStaffResumeMetroStation', ' м. ' + candidate.metro_station_id.ForeignDispName );
	}

	if ( auxData.relocationComment )
	{
		destStream.WriteStr( ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' );
		destStream.WriteStr( HtmlEncode( auxData.relocationComment ) );
	}

	destStream.WriteStr( '</p>\r\n' );

	destStream.WriteStr( '<p class="EStaffResumeContactsTitle">' );
	destStream.WriteStr( HtmlEncode( UiText.titles.contacts + ':' ) );
	destStream.WriteStr( '</p>\r\n' );

	destStream.WriteStr( '<p class="EStaffResumeContacts">' );
	WriteResumeElem( destStream, 'span', 'EStaffResumePhone', candidate.mobile_phone );

	if ( auxData.mobilePhonePriorityDesc != undefined )
	{
		destStream.WriteStr( HtmlEncode( auxData.mobilePhonePriorityDesc ) );
	}
	
	if ( candidate.home_phone.HasValue )
	{
		destStream.WriteStr( ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' );
		WriteResumeElem( destStream, 'span', 'EStaffResumePhone', candidate.home_phone );
	}
	
	destStream.WriteStr( ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' );

	destStream.WriteStr( '<a href="mailto:' + HtmlEncode( candidate.email ) + '">' );
	destStream.WriteStr( HtmlEncode( candidate.email ) );
	destStream.WriteStr( '</a>' );

	if ( candidate.skype.HasValue )
	{
		destStream.WriteStr( ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Skype: ' );
		WriteResumeElem( destStream, 'span', 'EStaffResumePhone', candidate.skype );
	}

	destStream.WriteStr( '</p>\r\n' );

	if ( candidate.Name == 'web_resume_instance' )
	{
		destStream.WriteStr( '<p class="EStaffResumeDate">' );
		destStream.WriteStr( lib_base.BuildUiParamEntry( UiText.titles.resume_last_update_on_xxx, StrDate( candidate.inet_source_date, false ) ) );
		/*if ( candidate.site_id.HasValue )
		{
			siteName = candidate.site_id.ForeignDispName;
			if ( candidate.site_id == 'hh' )
				siteName = StrReplaceOne( siteName, 'hh', 'HH' );
			else
				siteName = StrTitleCase( siteName );

			destStream.WriteStr( ' &nbsp; (' + siteName + ')' );
		}*/
		destStream.WriteStr( '<br/>' );

		destStream.WriteStr( '<a class="EStaffResumeSourceLink" href="' + candidate.src_url + '" target="_blank">' );
		destStream.WriteStr( HtmlEncode( candidate.src_url ) );
		destStream.WriteStr( '</a>' );
		destStream.WriteStr( '</p>' );
	}


	destStream.WriteStr( '</td><td>' );

	if ( auxData.photo != undefined && auxData.photo.data != undefined )
	{
/*		destStream.WriteStr( '<p>' );
		
		if ( auxData.photo.HasProperty( 'url' ) )
			destStream.WriteStr( '<a href="' + auxData.photo.url + '" target="_blank">' );

		destStream.WriteStr( '<img class="EStaffResumePhoto" src="data:' + auxData.photo.contentType + ';base64,' + Base64Encode( auxData.photo.data ) + '"' );
		
		WriteImageSizeAttr( destStream, auxData.photo );

		destStream.WriteStr( '/>' );
		if ( auxData.photo.HasProperty( 'url' ) )
			destStream.WriteStr( '</a>' );

		destStream.WriteStr( '</p>' );
*/
		destStream.WriteStr( '<p>' );
		
		if ( auxData.photo.HasProperty( 'url' ) )
			destStream.WriteStr( '<a href="' + auxData.photo.url + '" target="_blank">' );

		fileName = 'photo' + ContentTypeToFileNameSuffix( auxData.photo.contentType );
		reader.RegisterCompoundAttc( fileName, auxData.photo.data );

		//destStream.WriteStr( '<img class="EStaffResumePhoto" src="data:' + auxData.photo.contentType + ';base64,' + Base64Encode( auxData.photo.data ) + '"' );
		destStream.WriteStr( '<img class="EStaffResumePhoto" src="' + fileName + '"' );
	
		WriteImageSizeAttr( destStream, auxData.photo );

		destStream.WriteStr( '/>' );
		if ( auxData.photo.HasProperty( 'url' ) )
			destStream.WriteStr( '</a>' );

		destStream.WriteStr( '</p>' );

	}

	destStream.WriteStr( '</td></tr></table>' );


	destStream.WriteStr( '<hr class="EStaffResumeDelim"/>' );


	destStream.WriteStr( '<table><colgroup><col/><col/></colgroup>' );
	destStream.WriteStr( '<tr><td width="100%">' );

	if ( auxData.areas != undefined )
	{
		for ( area in auxData.areas )
		{
			destStream.WriteStr( '<p>' );
			destStream.WriteStr( HtmlEncode( area.name ) );
			destStream.WriteStr( '</p>' );

			destStream.WriteStr( '<ul>' );
			for ( subArea in area.areas )
			{
				destStream.WriteStr( '<li>' );
				destStream.WriteStr( HtmlEncode( subArea.name ) );
				destStream.WriteStr( '</li>' );
			}

			destStream.WriteStr( '</ul>' );
		}
	}

	if ( auxData.workTypeDesc != undefined || auxData.workScheduleTypeDesc != undefined )
	{
		destStream.WriteStr( '<br/>' );

		destStream.WriteStr( '<p>' );

		if ( true || auxData.isParsed )
		{
			if ( auxData.workTypeDesc != undefined )
				destStream.WriteStr( HtmlEncode( StrTitleCase( auxData.workTypeDesc ) ) );
			if ( auxData.workScheduleTypeDesc != undefined )
			{
				destStream.WriteStr( '<br/>' );
				destStream.WriteStr( HtmlEncode( auxData.workScheduleTypeDesc ) );
			}
		}
		else
		{
			destStream.WriteStr( '&bull; ' + srcResume.employment.name );
			destStream.WriteStr( ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &bull; ' + ArrayMerge( srcResume.schedules, 'name', ', ' ) );
			destStream.WriteStr( ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &bull; ' + srcResume.business_trip_readiness.name );
		}
		destStream.WriteStr( '</p>' );
	}

	/*if ( auxData.educTypeName != undefined || candidate.experience_months_num.HasValue )
	{
		destStream.WriteStr( '<br/>' );
		destStream.WriteStr( '<br/>' );

		destStream.WriteStr( '<p>' );

		if ( auxData.educTypeName != undefined )
			WriteResumeStr( destStream, UiText.fields.education + ': ' + auxData.educTypeName );
		else if ( candidate.educ_type_id.HasValue )
			WriteResumeStr( destStream, UiText.fields.education + ': ' + candidate.educ_type_id.ForeignDispName );

		if ( candidate.experience_months_num.HasValue )
		{
			if ( auxData.educTypeName != undefined || candidate.educ_type_id.HasValue )
				destStream.WriteStr( ' &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp; ' );
			
			WriteResumeStr( destStream, UiText.titles.total_work_experience + ': ' + GetMonthsNumLongDesc( candidate.experience_months_num ) );
		}

		destStream.WriteStr( '</p>' );
	}*/


	destStream.WriteStr( '</td><td>' );

	if ( candidate.salary.HasValue )
	{
		destStream.WriteStr( '<p class="EStaffResumeSalary">' );
		destStream.WriteStr( StrReplace( StrInt( candidate.salary, 0, true ) + ' ' + ( candidate.salary_currency_id == 'RUR' ? 'руб.' : candidate.salary_currency_id.ForeignElem.name ), ' ', '&nbsp;' ) );
		destStream.WriteStr( '</p>\r\n' );
	}

	destStream.WriteStr( '</td></tr></table>' );
	

	/*if ( candidate.skills_desc.HasValue && candidate.site_id == 'moikrug' )
	{
		WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', ( auxData.skills == undefined ? UiText.fields.key_skills : UiText.titles.about_me ) );
		WriteResumeElem( destStream, 'p', '', candidate.skills_desc );
	}*/

	BuildInetResumePrevJobs( destStream, candidate, auxData );
	BuildInetResumeSkills( destStream, candidate, auxData );
	BuildInetResumePrimaryEducations( destStream, candidate, auxData );
	//BuildInetResumeForeignLanguages( destStream, candidate, auxData );
	BuildInetResumeSecondaryEducations( destStream, candidate, auxData );
	BuildInetResumeAttestations( destStream, candidate, auxData );
	BuildInetResumeOtherInfo( destStream, candidate, auxData );
	//BuildInetResumeJobReferences( destStream, candidate, auxData );


	destStream.WriteStr( '</body>\r\n' );

	if ( useMsWord )
		reader.ExportCompoundAttc( destStream );

	destStream.WriteStr( '</html>\r\n' );

	return EncodeCharset( destStream.DetachStr(), 'utf-8' );
}


function BuildInetResumePrevJobs( destStream, candidate, auxData )
{
	if ( candidate.prev_jobs.ChildNum == 0 )
		return;

	WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', UiText.fields.work_experience );

	destStream.WriteStr( '<table>\r\n' );
	destStream.WriteStr( '<colgroup><col/><col/></colgroup>\r\n' );

	for ( prevJob in candidate.prev_jobs )
	{
		destStream.WriteStr( '<tr>\r\n' );

		destStream.WriteStr( '<td class="EStaffResumePeriodCell">\r\n' );
		destStream.WriteStr( '<p>' );
		destStream.WriteStr( '<span class="EStaffResumePeriodDate">' );
		destStream.WriteStr( ( prevJob.start_month != null ? base1_common.months[prevJob.start_month - 1].name + '.' : '' ) + prevJob.start_year + ' Ч<br/>' );
		destStream.WriteStr( '</span>' );

		destStream.WriteStr( '<span class="EStaffResumePeriodDate">' );
		if ( prevJob.end_year != null )
			destStream.WriteStr( base1_common.months[prevJob.end_month - 1].name + '.' + prevJob.end_year );
		else
			destStream.WriteStr( UiText.titles.present_time );

		destStream.WriteStr( '</span>' );
		destStream.WriteStr( '</p>' );

		if ( prevJob.start_date.HasValue )
		{
			destStream.WriteStr( '<p class="EStaffResumePeriodLengthDesc">' );
			destStream.WriteStr( HtmlEncode( GetMonthsNumLongDesc( GetMonthsDateDiff( prevJob.end_date, prevJob.start_date ) ) ) );
			destStream.WriteStr( '</p>' );
		}


		destStream.WriteStr( '</td>\r\n' );


		destStream.WriteStr( '<td class="EStaffResumeRightCell">\r\n' );
		WriteResumeElem( destStream, 'p', 'EStaffResumePrevJobOrgName', prevJob.org_name );
		
		if ( prevJob.org_location_name.HasValue || prevJob.org_web.HasValue || ( prevJob.ChildExists( 'org_industry_name' ) && prevJob.org_industry_name.HasValue ) )
		{
			destStream.WriteStr( '<p class="EStaffResumePrevJobOrgInfo">' );

			if ( prevJob.org_location_name.HasValue )
				destStream.WriteStr( HtmlEncode( prevJob.org_location_name ) );

			if ( prevJob.org_location_name.HasValue && prevJob.org_web.HasValue )
				destStream.WriteStr( ', ' );
			
			if ( prevJob.org_web.HasValue )
			{
				destStream.WriteStr( '<a class="EStaffResumePrevJobOrgWeb" href="' + prevJob.org_web + '" target="_new">' );
				destStream.WriteStr( HtmlEncode( BuildDispWebUrl( prevJob.org_web ) ) );
				destStream.WriteStr( '</a>' );
			}
			
			if ( prevJob.ChildExists( 'org_industry_name' ) && prevJob.org_industry_name.HasValue )
			{
				if ( ( prevJob.org_location_name.HasValue || prevJob.org_web.HasValue ) && ( prevJob.ChildExists( 'org_industry_name' ) && prevJob.org_industry_name.HasValue ) )
					destStream.WriteStr( ', ' );
			
				destStream.WriteStr( HtmlEncode( prevJob.org_industry_name ) );
			}

			destStream.WriteStr( '</p>' );
		}

		//if ( srcPrevJob.area != null )
			//WriteResumeElem( destStream, 'p', '', srcPrevJob.area.name );
		
		WriteResumeElem( destStream, 'p', 'EStaffResumePrevJobPositionName', prevJob.position_name );
		WriteResumeElem( destStream, 'p', 'EStaffResumePrevJobPositionComment', prevJob.comment );
		destStream.WriteStr( '</td>\r\n' );

		destStream.WriteStr( '</tr>\r\n' );
	}

	destStream.WriteStr( '</table>\r\n' );
}


function BuildInetResumeSkills( destStream, candidate, auxData )
{
	if ( auxData.skills != undefined && auxData.skills.length != 0 )
	{
		WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', UiText.fields.key_skills );
		destStream.WriteStr( '<p>' );

		for ( srcSkill in auxData.skills )
		{
			destStream.WriteStr( '&bull; ' );
			WriteResumeElem( destStream, 'span', '', srcSkill.name );
			destStream.WriteStr( ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' );
		}

		destStream.WriteStr( '<p>' );
	}

	/*if ( candidate.skills_desc.HasValue && candidate.site_id != 'moikrug' )
	{
		WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', ( auxData.skills == undefined ? UiText.fields.key_skills : UiText.titles.about_me ) );
		WriteResumeElem( destStream, 'p', '', candidate.skills_desc );
	}*/

	if ( auxData.aboutMeDesc != undefined )
	{
		WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', UiText.titles.about_me );
		WriteResumeElem( destStream, 'p', '', auxData.aboutMeDesc );
	}
}


function BuildInetResumePrimaryEducations( destStream, candidate, auxData )
{
	array = ArraySelect( candidate.prev_educations, '! is_secondary' );
	if ( array.length == 0 )
		return;

	WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', UiText.fields.education );

	destStream.WriteStr( '<table>\r\n' );
	destStream.WriteStr( '<colgroup>\r\n' );
	destStream.WriteStr( '<col/><col/>' );
	destStream.WriteStr( '</colgroup>\r\n' );

	for ( prevEduc in array )
	{
		destStream.WriteStr( '<tr>\r\n' );

		destStream.WriteStr( '<td class="EStaffResumePeriodCell">\r\n' );
		WriteResumeElem( destStream, 'p', '', prevEduc.end_year );
		destStream.WriteStr( '</td>\r\n' );

		destStream.WriteStr( '<td class="EStaffResumeRightCell">\r\n' );
		WriteResumeElem( destStream, 'p', 'EStaffResumePrevJobOrgName', prevEduc.org_name );
		
		if ( prevEduc.department_name.HasValue )
			WriteResumeElem( destStream, 'p', '', prevEduc.department_name );

		/*if ( prevEduc.org_location_name.HasValue )
		{
			destStream.WriteStr( '<p class="EStaffResumePrevJobOrgInfo">' );
			destStream.WriteStr( HtmlEncode( prevEduc.org_location_name ) );
			destStream.WriteStr( '</p>' );
		}*/

		WriteResumeElem( destStream, 'p', '', prevEduc.speciality_name );
		destStream.WriteStr( '</td>\r\n' );

		destStream.WriteStr( '</tr>\r\n' );
	}

	destStream.WriteStr( '</table>\r\n' );
}


function BuildInetResumeSecondaryEducations( destStream, candidate, auxData )
{
	array = ArraySelect( candidate.prev_educations, 'is_secondary' );
	if ( array.length == 0 )
		return;

	WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', UiText.titles.additional_education );

	destStream.WriteStr( '<table>\r\n' );
	destStream.WriteStr( '<colgroup>\r\n' );
	destStream.WriteStr( '<col/><col/>' );
	destStream.WriteStr( '</colgroup>\r\n' );

	for ( prevEduc in array )
	{
		destStream.WriteStr( '<tr>\r\n' );

		destStream.WriteStr( '<td class="EStaffResumePeriodCell">\r\n' );
		WriteResumeElem( destStream, 'p', '', prevEduc.end_year );
		destStream.WriteStr( '</td>\r\n' );

		destStream.WriteStr( '<td class="EStaffResumeRightCell">\r\n' );
		WriteResumeElem( destStream, 'p', 'EStaffResumePrevJobOrgName', prevEduc.org_name );
		WriteResumeElem( destStream, 'p', '', prevEduc.speciality_name );
		destStream.WriteStr( '</td>\r\n' );

		destStream.WriteStr( '</tr>\r\n' );
	}

	destStream.WriteStr( '</table>\r\n' );
}


function BuildInetResumeAttestations( destStream, candidate, auxData )
{
	if ( auxData.attestations == undefined )
		return;

	WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', UiText.titles.additional_education__2 );

	destStream.WriteStr( '<table>\r\n' );
	destStream.WriteStr( '<colgroup>\r\n' );
	destStream.WriteStr( '<col/><col/>' );
	destStream.WriteStr( '</colgroup>\r\n' );

	for ( attestation in auxData.attestations )
	{
		destStream.WriteStr( '<tr>\r\n' );

		destStream.WriteStr( '<td class="EStaffResumePeriodCell">\r\n' );
		WriteResumeElem( destStream, 'p', '', attestation.end_year );
		destStream.WriteStr( '</td>\r\n' );

		destStream.WriteStr( '<td class="EStaffResumeRightCell">\r\n' );
		WriteResumeElem( destStream, 'p', 'EStaffResumePrevJobOrgName', attestation.org_name );
		WriteResumeElem( destStream, 'p', '', attestation.speciality_name );
		destStream.WriteStr( '</td>\r\n' );

		destStream.WriteStr( '</tr>\r\n' );
	}

	destStream.WriteStr( '</table>\r\n' );
}


function BuildInetResumeForeignLanguages( destStream, candidate, auxData )
{
	if ( candidate.foreign_languages.ChildNum == 0 )
		return;

	WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', UiText.titles.languages_knowledge );

	for ( foreignLanguage in candidate.foreign_languages )
	{
		destStream.WriteStr( '<p>' );
		destStream.WriteStr( HtmlEncode( foreignLanguage.language_name ) );
		
		if ( foreignLanguage.level_name.HasValue )
			WriteResumeElem( destStream, 'span', 'EStaffResumeLanguageLevel', ' Ч ' + foreignLanguage.level_name );
		
		destStream.WriteStr( '</p>' );
	}
}


function BuildInetResumeOtherInfo( destStream, candidate, auxData )
{
	if ( auxData.miscItems == undefined && auxData.citizenshipName == undefined && auxData.desiredWorkTripTime == undefined && auxData.otherInfoDesc == undefined )
		return;

	WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', UiText.fields.other_info );

	if ( auxData.citizenshipName != undefined )
		WriteResumeElem( destStream, 'p', '', UiText.fields.citizenship + ': ' + auxData.citizenshipName );

	if ( auxData.desiredWorkTripTime != undefined )
		WriteResumeElem( destStream, 'p', '', ( UiText.titles.ChildExists( 'desired_work_trip_time' ) ? UiText.titles.desired_work_trip_time : '∆елательное врем€ в пути до работы' ) + ': ' + auxData.desiredWorkTripTime );

	if ( auxData.miscItems != undefined )
	{
		destStream.WriteStr( '<ul>' );

		for ( miscItem in auxData.miscItems )
		{
			destStream.WriteStr( '<li>' );
			destStream.WriteStr( HtmlEncode( miscItem.name ) );
			destStream.WriteStr( '</li>' );
		}

		destStream.WriteStr( '</ul>' );
	}

	if ( auxData.otherInfoDesc != undefined )
		WriteResumeElem( destStream, 'p', '', auxData.otherInfoDesc );
}


function BuildInetResumeJobReferences( destStream, candidate, auxData )
{
	if ( candidate.job_references.ChildNum == 0 )
		return;

	WriteResumeElem( destStream, 'h2', 'EStaffResumeSectionTitle', UiText.fields.job_references );

	for ( jobReference in candidate.job_references )
	{
		WriteResumeElem( destStream, 'p', '', jobReference.org_name );
		WriteResumeElem( destStream, 'p', '', jobReference.fullname + ' Ч ' + jobReference.position_name );
		WriteResumeElem( destStream, 'p', '', jobReference.phone );
	}
}



function WriteResumeElem( destStream, nodeName, className, text )
{
	destStream.WriteStr( '<' + nodeName + ' class="' + className + '">' );
	destStream.WriteStr( HtmlEncode( text ) );
	destStream.WriteStr( '</' + nodeName + '>\r\n' );
}


function WriteResumeStr( destStream, str )
{
	destStream.WriteStr( HtmlEncode( str ) );
}


function GetMonthsDateDiff( date1, date2 )
{
	if ( date1 == null )
		date1 = Date( Year( CurDate ), Month( CurDate ), 1 );

	return DateDiff( date1, date2 ) / ( 86400 * 30 ) + 1;
}


function GetMonthsNumLongDesc( monthsNum )
{
	if ( monthsNum == null )
		return '';

	str = '';

	yearsNum = monthsNum / 12;
	if ( yearsNum != 0 )
		str = yearsNum + ' ' + IntModSelector( yearsNum, UiText.titles.years__mod );
	
	monthsNum = monthsNum % 12;
	if ( monthsNum != 0 )
	{
		if ( str != '' )
			str += ' ';

		str += monthsNum + ' ' + IntModSelector( monthsNum, UiText.titles.months__mod );
	}
	
	return str;
}


function BuildDispWebUrl( url )
{
	str = url;
	str = StrReplaceOne( str, 'http://', '' );
	str = StrReplaceOne( str, 'https://', '' );
	return str;
}


function WriteImageSizeAttr( destStream, imageInfo )
{
	if ( imageInfo.maxWidth == undefined || imageInfo.maxHeight == undefined )
		return '';

	if ( imageInfo.data == undefined )
		return;

	image = new Image;
	image.UsageMode = 'ReadProperties';

	try
	{
		image.Load( imageInfo.data );
		imageInfo.width = image.Width;
		imageInfo.height = image.Height;
	}
	catch ( e )
	{
		alert( e );
	}

	if ( imageInfo.width == undefined || imageInfo.height == undefined )
	{
		str = '';
		str += 'max-width:' + imageInfo.maxWidth + 'px;';
		str += 'max-height:' + imageInfo.maxHeight + 'px;';
		
		destStream.WriteStr( ' style="' + str + '"' );
		return;
	}

	if ( imageInfo.width > imageInfo.maxWidth )
		scale1 = Real( imageInfo.width ) / imageInfo.maxWidth;
	else
		scale1 = 1;
		
	if ( imageInfo.height > imageInfo.maxHeight )
		scale2 = Real( imageInfo.height ) / imageInfo.maxHeight;
	else
		scale2 = 1;

	scale = Max( scale1, scale2 );
	
	destStream.WriteStr( ' width="' + Int( imageInfo.width / scale ) + '"' );
	destStream.WriteStr( ' height="' + Int( imageInfo.height / scale ) + '"' );
}
