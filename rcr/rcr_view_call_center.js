function HandleAddNewCandidate()
{
	curCandidateDoc = OpenNewDoc( '//rcr/rcr_candidate.xmd' );
	curCandidate = curCandidateDoc.TopElem;

	if ( ( recruitType = GetOptForeignElem( recruit_types, 'selection' ) ) != undefined )
		curCandidate.recruit_type_id = recruitType.id;
}


function PrepareCurCandidateObjectDoc()
{
	if ( ! curCandidateDoc.NeverSaved )
		return;

	//curCandidate.view.is_new = Doc.NeverSaved;

	fields_usage.check_object_required_fields( curCandidate );
	
	if ( curCandidate.fullname == '' )
		throw UiError( UiText.errors.candidate_fullname_not_specified );

	curCandidateDoc.BindToDb();
}


function OnDuplicateCheckCriticalFieldChanged()
{
	if ( duplicate_check.filter.EqualToElem( curCandidate ) )
		return;

	if ( curCandidate.mobile_phone == '' && curCandidate.email == '' )
	{
		if ( curCandidate.lastname == '' || curCandidate.firstname == '' )
			return;

		if ( curCandidate.middlename == '' && curCandidate.birth_date == null )
			return;
	}

	duplicate_check.filter.AssignElem( curCandidate );

	qualStr = '';

	if ( duplicate_check.filter.lastname != '' )
		qualStr += ' or $elem/fullname = ' + XQueryLiteral( lib_base.get_person_fullname( duplicate_check.filter ) );

	if ( duplicate_check.filter.mobile_phone != '' )
		qualStr += ' or $elem/mobile_phone = ' + XQueryLiteral( duplicate_check.filter.mobile_phone );

	if ( duplicate_check.filter.email != '' )
		qualStr += ' or $elem/email = ' + XQueryLiteral( duplicate_check.filter.email );

	queryStr = 'for $elem in candidates';
	queryStr += StrReplaceOne( qualStr, ' or ', ' where ' );
	
	//if ( System.IsWebClient ) // !!!
		//queryStr += ' return $elem';
	//else
		queryStr += ' return $elem/Fields( "id", "lastname", "fullname", "birth_date", "birth_year", "mobile_phone", "email", "email2", "location_id", "state_id", "last_comment", "user_id" )';

	array = XQuery( queryStr );
	duplicate_check.foundCandidatesArray = new Array;

	for ( candidate in array )
	{
		duplicate_check.foundCandidatesArray.push( candidate );
	}

	if ( duplicate_check.foundCandidatesArray.length != 0 )
	{
		bottom_selector = 'duplicates';
	}
	else
	{
		bottom_selector = 'my_candidates';
	}
}


function SetPreviewDupCandidate( candidate )
{
	screen = FindScreen( 'FrameDupCandidatesPreview' );

	//dest_candidate_id = candidate.id;
	//dest_external_candidate_ref.Clear();

	try
	{
		selector = screen.Doc.TopElem.preview.selector;
	}
	catch ( e )
	{
		selector = 'common';
	}

	doc = DefaultDb.OpenObjectDoc( 'candidate', candidate.id );
	doc.TopElem.preview.selector = selector;

	screen.EditMode = false;
	screen.SetDoc( doc, '//rcr/rcr_candidate_preview.xms' );
}


function has_duplicates()
{
	return ( duplicate_check.foundCandidatesArray != undefined && duplicate_check.foundCandidatesArray.length != 0 );
}