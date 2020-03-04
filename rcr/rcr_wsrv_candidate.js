function AddCandidate( candidate )
{
	CheckTokenAuth( Request );

	if ( ! candidate.lastname.HasValue || ! candidate.firstname.HasValue || ! candidate.mobile_phone.HasValue )
		throw UserError( 'Required fields are empty' );

	destCandidateDoc = DefaultDb.OpenNewObjectDoc( 'candidate' );
	destCandidate = destCandidateDoc.TopElem;

	destCandidate.AssignElem( candidate );

	destCandidate.mobile_phone = lib_phone_details.PhoneToGlobalPhone( candidate.mobile_phone );

	ConvertCustomFields( destCandidate, candidate );
	BuildCandidateResume( destCandidate, candidate );

	destCandidate.source_id = 'landing_page';

	destCandidate.pd_consent_received = true;
	destCandidate.pd_consent_date = CurDate;

	destCandidateDoc.Save();
}


function ConvertCustomFields( destCandidate, candidate )
{
	for ( srcElem in candidate.csd )
	{
		destElem = destCandidate.OptChild( srcElem.Name );
		if ( destElem != undefined )
			destElem.Value = srcElem.Value;
	}
}


function BuildCandidateResume( destCandidate, candidate )
{
	auxData = new Object;
	auxData.SetStrictMode( false );
	
	photo = new Object;
	photo.SetStrictMode( false );
	photo.contentType = ( candidate.photo.content_type != '' ? candidate.photo.content_type : 'image/jpeg' );
	photo.data = candidate.photo.data;
	photo.maxWidth = 150;
	photo.maxHeight = 200;

	auxData.photo = photo;

	htmlStr = OpenCodeLib( 'rcr_lib_candidate_resume.js' ).BuildInetResume( destCandidate, auxData );
	attachment = destCandidate.attachments.ObtainChildByKey( 'resume', 'type_id' );
	attachment.text = htmlStr;
	attachment.content_type = 'text/html';
}




function AddCandidateAttachment( candidate, attachment )
{
}



function GetCandidateAttachments( candidate, attachment )
{
}



function SearchCandidates( filter, options )
{
	if ( ! rcr_config.use_ext_duplicates_search )
		throw UserError( 'Service disabled' );

	if ( options.search_mode == 'single_elem' )
	{
		queryStr = 'for $elem in candidates';

		qual = ' and $elem/id = ' + filter.id.XQueryLiteral;

		queryStr += StrReplaceOne( qual, ' and ', ' where ' ) + ' return $elem';
		array = XQuery( queryStr );
	}
	else if ( options.search_mode = 'duplicates' )
	{
		candidateInfo = CreateElem( 'rcr_candidate.xmd', 'candidate' );
		candidateInfo.AssignElem( filter );

		array = lib_candidate_dup.find_dup_candidates( candidateInfo );
	}
	else
	{
		throw UserError( 'Invalid search mode' );
	}

	for ( candidate in array )
	{
		destCandidate = CurMethodResult.candidates.AddChild();
		destCandidate.AssignElem( candidate );
		destCandidate.state_name = candidate.state_id.ForeignDispName;
		destCandidate.user_name = candidate.user_id.ForeignElem.fullname;
		destCandidate.group_name = candidate.group_id.ForeignDispName;

		for ( event in lib_base.query_records_by_key( events, candidate.id, 'candidate_id' ) )
		{
			record = destCandidate.records.AddChild();
			record.id = event.id;
			record.date = event.date;
			record.state_name = event.state_name;
			record.user_name = event.user_id.ForeignElem.fullname;
		}
	}
}


function CheckTokenAuth( Request )
{
	authStr = Request.Header.GetOptProperty( 'Authorization', '' );
	if ( ( obj = StrOptScan( authStr, 'Bearer %s' ) ) == undefined )
		HandleWrongAuth( Request );

	if ( obj[0] != AppConfig.GetProperty( 'job-portal-access-token' ) )
	{
		Sleep( 800 );
		throw UserError( 'Invalid token' );
	}
}


function HandleWrongAuth( Request )
{
	Sleep( 800 );
	Request.AddRespHeader( 'WWW-Authenticate', 'Bearer' );
	Request.SetRespStatus( 401, 'Authorization required' );
	Cancel();
}