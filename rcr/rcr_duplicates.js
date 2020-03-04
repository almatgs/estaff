function RemoveDupCandidates()
{
	prevCandidate = undefined;

	array = XQuery( 'for $elem in candidates order by $elem/fullname return $elem' );
	dupCount = 0;

	StartModalTask( UiText.messages.searching_for_duplicates + '...' );

	for ( candidate in array )
	{
		ModalTaskMsg( candidate.fullname );

		if ( prevCandidate != undefined && candidate.fullname != '' && candidate.email != '' && candidate.fullname == prevCandidate.fullname && candidate.email == prevCandidate.email )
		{
			if ( CheckMergeCandidates( prevCandidate.id, candidate.id ) )
			{
				dupCount++;
				prevCandidate = undefined;
			}
			else
			{
				prevCandidate = candidate;
			}
		}
		else
		{
			prevCandidate = candidate;
		}

		//ReleaseCachedXQueryRecord( array, candidate );
	}

	FinishModalTask();

	lib_base.show_info_message( ActiveScreen, UiText.messages.duplicates_merged + ': ' + dupCount );
	//UpdateScreens( '*', '*candidates*' );
}


function CheckMergeCandidates( id1, id2 )
{
	candidateDoc1 = DefaultDb.OpenObjectDoc( 'candidate', id1 );
	candidateDoc2 = DefaultDb.OpenObjectDoc( 'candidate', id2 );

	if ( candidateDoc1.TopElem.spots.ChildNum != 0 && candidateDoc2.TopElem.spots.ChildNum != 0 )
		return false;

	hasHistory1 = ( candidateDoc1.TopElem.state_id != 'new' );
	hasHistory2 = ( candidateDoc2.TopElem.state_id != 'new' );

	if ( hasHistory1 )
	{
		if ( hasHistory2 )
			return false;
	}
	else
	{
		if ( hasHistory2 )
		{
			tempCandidateDoc = candidateDoc1;
			candidateDoc1 = candidateDoc2;
			candidateDoc2 = tempCandidateDoc;
		}
	}

	MergeCandidateInfo( candidateDoc1.TopElem, candidateDoc2.TopElem );

	DeleteDoc( candidateDoc2.Url );
	candidateDoc1.Save();

	return true;
}


function MergeCandidateInfo( candidate1, candidate2 )
{
	if ( candidate1.birth_date == null )
	{
		candidate1.birth_date = candidate2.birth_date;
		candidate1.birth_year = candidate2.birth_year;
	}

	if ( candidate1.location_id == null )
		candidate1.location_id = candidate2.location_id;

	if ( candidate1.address == '' )
		candidate1.address = candidate2.address;

	if ( candidate2.home_phone != '' && ! StrContains( candidate1.disp_phone, candidate2.home_phone ) )
		candidate1.home_phone = Trim( candidate1.home_phone + ' ' + candidate2.home_phone );

	if ( candidate2.work_phone != '' && ! StrContains( candidate1.disp_phone, candidate2.work_phone ) )
		candidate1.work_phone = Trim( candidate1.work_phone + ' ' + candidate2.work_phone );

	if ( candidate2.mobile_phone != '' && ! StrContains( candidate1.disp_phone, candidate2.mobile_phone ) )
		candidate1.mobile_phone = Trim( candidate1.mobile_phone + ' ' + candidate2.mobile_phone );

	for ( spot2 in candidate2.spots )
		candidate1.spots.AddChild().AssignElem( spot2 );

	for ( attachment2 in candidate2.attachments )
	{
		match = false;

		if ( attachment2.content_type == 'text/html' )
		{
			for ( attachment1 in candidate1.attachments )
			{
				if ( attachment1.content_type == 'text/html' && attachment1.text == attachment2.text )
				{
					match = true;
					break;
				}
			}
		}

		if ( ! match )
			candidate1.attachments.AddChild().AssignElem( attachment2 );
	}
}




