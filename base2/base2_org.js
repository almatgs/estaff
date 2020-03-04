function OnCreate()
{
	user_id = LdsCurUserID;
	group_id = lib_user.active_user_info.main_group_id;

	lib_base.init_new_card_object( This );

	if ( global_settings.use_customers )
		is_customer = true;
}


function OnCheckReadAccess()
{
	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	if ( userAccess.prohibit_view_other_group_orgs && ! LdsCurUser.matches_group( group_id ) )
		Cancel();
}


function OnUpdateSecondaryData( srcEvent )
{
	isChanged = false;
	
	if ( UpdateLastEventData() )
		isChanged = true;

	personsArray = ArraySort( XQuery( 'for $person in persons where $person/org_id = ' + Doc.DocID + ' return $person' ), 'org_person_priority', '-', 'last_contact_date', '-' );
	persons_num = ArrayCount( personsArray );

	newFtSecondaryText = ArrayMerge( personsArray, 'fullname', ' ' );
	if ( ft_secondary_text != newFtSecondaryText )
	{
		ft_secondary_text = newFtSecondaryText;
		isChanged = true;
	}

	mainPersonsDesc = ArrayMerge( ArrayRange( personsArray, 0, 2 ), 'fullname', ', ' );
	if ( persons_num > 2 )
		mainPersonsDesc += ', ...';

	if ( main_persons_desc != mainPersonsDesc )
	{
		main_persons_desc = mainPersonsDesc;
		isChanged = true;
	}

	if ( persons_num != 0 )
		lastContactDate = ArrayMax( personsArray, 'last_contact_date' ).last_contact_date;
	else
		lastContactDate = null;

	if ( last_contact_date > lastContactDate )
		lastContactDate = last_contact_date;

	if ( last_contact_date != lastContactDate )
	{
		last_contact_date = lastContactDate;
		isChanged = true;
	}

	if ( ChildExists( 'vacancies_num' ) )
	{
		array = XQuery( 'for $elem in vacancies where $elem/org_id = ' + id + ' return $elem' );
		
		vacanciesNum = ArrayCount( array );
		activeVacanciesNum = ArrayCount( ArraySelectByKey( array, true, 'is_active' ) );
		
		if ( vacancies_num != vacanciesNum )
		{
			vacancies_num = vacanciesNum;
			isChanged = true;
		}

		if ( active_vacancies_num != activeVacanciesNum )
		{
			active_vacancies_num = activeVacanciesNum;
			isChanged = true;
		}
	}

	if ( AppModuleUsed( 'crm' ) )
	{
		array = XQuery( 'for $elem in deals where $elem/org_id = ' + Doc.DocID + ' return $elem' );
		deals_num = ArrayCount( array );
		
		if ( deals_num != 0 )
		{
			is_tentative = false;
		}
		else
		{
			//if ( ! is_lost )
				//is_tentative = true;
			
			deals_num = null;
		}
	}

	return isChanged;
}


function OnBeforeSave()
{
	lib_voc.update_idata_by_voc( group_id );
}


function OnSave()
{
	if ( ChildExists( 'is_candidate_source' ) )
	{
		if ( is_candidate_source || is_recruiting_agency )
			lib_recruit.build_org_candidate_source( id.Parent );
	}
}


function object_title()
{
	if ( is_own_org )
		return UiText.objects.own_org;

	return UiText.objects.org;
}


function image_url()
{
	if ( is_own_org )
		return '//base_pict/org_own.ico';
	else if ( is_tentative )
		return '//base_pict/org_tentative.ico';
	else if ( is_active )
		return '//base_pict/org.ico';
	else
		return '//base_pict/org_inactive.ico';
}


function handle_event_changed( srcEvent )
{
	return UpdateLastEventData();
}


function handle_ui_event_changed( srcEvent )
{
}


function UpdateLastEventData()
{
	isChanged = false;
	lastEvent = opt_last_event;

	if ( lastEvent != undefined )
	{
		newLastEventTypeID = lastEvent.type_id;
		newLastEventOccurrenceID = lastEvent.occurrence_id;

		if ( lastEvent.type.use_end_date && lastEvent.end_date.HasValue && lastEvent.end_date <= CurDate && lastEvent.occurrence_id.HasValue )
			newLastEventDate = lastEvent.end_date;
		else
			newLastEventDate = lastEvent.date;

		newLastComment = StrLeftRange( Trim( UnifySpaces( lastEvent.comment ) ), 60 );
	}
	else
	{
		newLastEventTypeID = '';
		newLastEventOccurrenceID = '';
		newLastEventDate = creation_date;
		newLastComment = '';
	}

	if ( last_event_type_id != newLastEventTypeID )
	{
		last_event_type_id = newLastEventTypeID;
		isChanged = true;
	}

	if ( last_event_occurrence_id != newLastEventOccurrenceID )
	{
		last_event_occurrence_id = newLastEventOccurrenceID;
		isChanged = true;
	}

	if ( last_event_date != newLastEventDate )
	{
		last_event_date = newLastEventDate;
		isChanged = true;
	}

	if ( last_comment != newLastComment )
	{
		last_comment = newLastComment;
		isChanged = true;
	}

	return isChanged;
}


function events_array()
{
	XQuery( 'for $elem in events where $elem/org_id = ' + id.XQueryLiteral + ' return $elem' )
}


function opt_last_event()
{
	return ArrayOptMax( events_array, 'date' );
}


function get_last_event_type_id()
{
	lastEvent = opt_last_event;
	if ( lastEvent == undefined )
		return '';

	return lastEvent.type_id;
}


function get_last_event_date()
{
	lastEvent = opt_last_event;
	if ( lastEvent == undefined )
		return ( creation_date != null ? creation_date : CurDate );

	if ( lastEvent.type.use_end_date && lastEvent.end_date.HasValue && lastEvent.end_date <= CurDate && lastEvent.occurrence_id.HasValue )
		return lastEvent.end_date;

	return lastEvent.date;
}


function update_last_event()
{
	state_id = get_state_id();
	state_date = get_state_date();
}


function handle_edit_name()
{
	if ( System.IsWebClient )
		return;

	if ( full_name != '' )
		return;

	newName = OrgDispName( name );
	if ( StrLowerCase( newName ) == StrLowerCase( name ) )
		return;
	
	full_name = name;
	name = newName;
}


function handle_edit_full_name()
{
	if ( System.IsWebClient )
		return;

	if ( name != '' )
		return;

	name = OrgDispName( full_name );
}


function convert_old_bank_account()
{
	if ( bank_accounts.ChildNum != 0 )
		return;

	if ( ! bank_account.no.HasValue )
		return;

	bankAccount = bank_accounts.AddChild();

	bankAccount.has_custom_org_name = bank_account.has_custom_recipient;
	if ( bankAccount.has_custom_org_name )
		bankAccount.org_name = bank_account.custom_recipient_desc;

	bankAccount.no = bank_account.no;
	bankAccount.bank_name = bank_account.bank.name;
	bankAccount.cno = bank_account.cno;
	bankAccount.bic = bank_account.bank.bic;

	bank_account.Clear();
}


function convert_old_document_signer()
{
	if ( document_signers.ChildNum != 0 )
		return;

	if ( ! ceo.lastname.HasValue )
		return;

	signer = document_signers.AddChild();
	signer.AssignElem( ceo );
	signer.mod2_name.AssignElem( ceo.mod_name );

	ceo.Clear();
}


function main_bank_account()
{
	account = ArrayOptFind( bank_accounts, 'is_active' );
	if ( account == undefined )
		return CreateElem( '//base2/base2_org.xmd', 'org.bank_accounts.bank_account' );

	return account;
}


function main_document_signer()
{
	signer = ArrayOptFind( document_signers, 'is_active' );
	if ( signer == undefined )
		return CreateElem( '//base2/base2_org.xmd', 'org.document_signers.document_signer' );

	return signer;
}


function full_account_details_desc()
{
	str = full_name + '\r\n';
	str += legal_address + '\r\n';
	
	if ( inn.HasValue )
	{
		str += inn.Title + ' ' + inn + ' ' + kpp.Title + ' ' + kpp + '\r\n';
	}

	str += '\r\n';

	account = main_bank_account;

	if ( account.no.HasValue )
	{
		str += 'ð/c ' + account.no + '\r\n';
		str += account.bank_name + '\r\n';
		str += 'ê/c ' + account.cno + '\r\n';
		str += 'ÁÈÊ ' + account.bic + '\r\n';
	}

	return str;
}

