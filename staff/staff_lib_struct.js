function GetDivisionExplicitOrgID( divisonID )
{
	array = lib_base.get_hier_chain( divisions, divisonID );
	if ( array.length == 0 )
		return null;

	topDivision = array[array.length - 1];
	if ( ! topDivision.is_org )
		return null;
	
	return topDivision.org_id;
}


function ObtainOrgBridgeDivision( orgID )
{
	division = GetOptForeignElem( divisions, orgID );
	if ( division != undefined )
		return division.id;

	org = GetForeignElem( orgs, orgID );

	divisionDoc = DefaultDb.OpenNewObjectDoc( 'division', orgID );
	division = divisionDoc.TopElem;
	division.is_org = true;
	division.org_id = orgID;
	division.name = org.name;
	divisionDoc.Save();

	return division.id;
}


function GetUpperDivisionWithType( origDivisionID, typeID )
{
	division = ArrayOptFindByKey( GetDivisonsChain( origDivisionID ), typeID, 'type_id' );
	if ( division == undefined )
		throw UiError( lib_base.BuildUiParamEntry( UiText.errors.upper_division_for_xxx_of_type_xxx_not_found, GetForeignElem( divisions, origDivisionID ).name, GetForeignElem( division_types, typeID ).name ) );

	return division;
}


function GetDivisionHead( divisonID )
{
	person = GetOptDivisionHead( divisonID );
	if ( person == undefined )
		throw UiError( StrReplaceOne( UiText.errors.division_xxx_head_not_found, '%s', GetForeignElem( divisions, divisonID ).ExternalDispName ) );

	return person;
}


function GetOptDivisionHead( divisionID )
{
	person = ArrayOptFirstElem( XQuery( 'for $elem in persons where $elem/division_id = ' + XQueryLiteral( divisionID ) + ' and $elem/is_division_head = true() and $elem/is_active = true() and $elem/employee_state_id = \'\' return $elem' ) );
	if ( person != undefined )
		return person;

	/*
	person = GetOptDivisionPersonWithRole( divisionID, 'division_head' );
	if ( person != undefined )
		return person;
	*/

	return undefined;
}


function GetOptDivisionHeadRec( divisonID )
{
	for ( curDivision in GetDivisonsChain( divisonID ) )
	{
		person = GetOptDivisionHead( curDivision.id );
		if ( person != undefined )
			return person;
	}

	return undefined;
}


function GetDivisionHeadRec( divisonID, options )
{
	person = GetOptDivisionHeadRec( divisonID );
	if ( person == undefined )
		throw UiError( StrReplaceOne( UiText.errors.division_xxx_head_rec_not_found, '%s', GetForeignElem( divisions, divisonID ).name ) );

	return person;
}


function GetPersonDirectSupervisor( personID, options )
{
	person = GetOptForeignElem( persons, personID );
	if ( person == undefined )
		throw UserError( 'Unable to get person by ID: ' + personID );

	if ( ! person.division_id.HasValue )
		throw UiError( StrReplaceOne( UiText.errors.division_not_specified_for_person_xxx, '%s', person.fullname ) );

	curDivision = person.division_id.ForeignElem;

	if ( person.is_division_head )
	{
		if ( ! curDivision.parent_id.HasValue )
			throw UserError( 'No upper division for person: ' + person.fullname );

		curDivision = curDivision.parent_id.ForeignElem;
	}

	return GetDivisionHeadRec( curDivision.id, options );
}


function GetOptPersonDirectSupervisor( personID, options )
{
	person = GetOptForeignElem( persons, personID );
	if ( person == undefined )
		throw UserError( 'Unable to get person by ID: ' + personID );

	if ( ! person.division_id.HasValue )
		return undefined;

	curDivision = person.division_id.ForeignElem;

	if ( person.is_division_head )
	{
		if ( ! curDivision.parent_id.HasValue )
			return undefined;

		curDivision = curDivision.parent_id.ForeignElem;
	}

	return GetOptDivisionHeadRec( curDivision.id, options );
}


function GetOptDivisionPersonWithRole( divisionID, roleTypeID )
{
	rolesArray = ArraySort( XQuery( 'for $elem in person_struct_roles where $elem/division_id = ' + XQueryLiteral( divisionID ) + ' and $elem/type_id = ' + XQueryLiteral( roleTypeID ) + ' return $elem' ), 'priority_id', '+' );
	for ( structRole in rolesArray )
	{
		person = structRole.person_id.OptForeignElem;
		if ( person == undefined )
			continue;

		if ( person.employee_state_id != '' )
			continue;

		if ( person.dismissal_date.HasValue && person.dismissal_date <= CurDate )
			continue;

		return person;
	}

	return undefined;
	
	return structRole.person_id.OptForeignElem;
}


function GetDivisionPersonWithRole( divisionID, roleTypeID, request )
{
	person = GetOptDivisionPersonWithRole( divisionID, roleTypeID );
	if ( person == undefined )
		HandleWorkflowError( 'Отсутствует сотрудник с ролью "' + GetForeignElem( person_struct_role_types, roleTypeID ).name + '" для подразделения "' + GetForeignElem( divisions, divisionID ).name + '"', request );

	return person;
}


function GetOptDivisionPersonWithRoleRec( divisionID, roleTypeID )
{
	for ( curDivision in lib_base.get_hier_chain( divisions, divisionID ) )
	{
		person = GetOptDivisionPersonWithRole( curDivision.id, roleTypeID )
		if ( person != undefined )
			return person;
	}

	return undefined;
}


function GetDivisionPersonWithRoleRec( divisionID, roleTypeID )
{
	person = GetOptDivisionPersonWithRoleRec( divisionID, roleTypeID );
	if ( person == undefined )
		throw UiError( StrReplaceOne( StrReplaceOne( UiText.errors.person_with_role_xxx_for_division_xxx_rec_not_found, '%s', GetForeignElem( person_struct_role_types, roleTypeID ).name ), '%s', GetForeignElem( divisions, divisionID ).ExternalDispName ) );

	return person;
}


function PersonHasRole( personID, roleTypeID )
{
	rolesArray = XQuery( 'for $elem in person_struct_roles where $elem/person_id = ' + XQueryLiteral( personID ) + ' and $elem/type_id = ' + XQueryLiteral( roleTypeID ) + ' return $elem' );
	return ( ArrayOptFirstElem( rolesArray ) != undefined );
}


function get_person_top_division_head( origPerson, request )
{
	if ( ! origPerson.division_id.HasValue )
		throw UserError( 'Empty division ID for person: ' + origPerson.fullname );

	curDivision = GetTopDivison( origPerson.division_id.ForeignElem );
	return get_division_head( curDivision, request );
}


function GetDivisionShopHead( divisionID, request )
{
	shopDivision = ArrayOptFindByKey( GetDivisonsChain( divisionID ), 'shop', 'type_id' );
	if ( shopDivision == undefined )
		throw UserError( 'shopDivision == undefined' );
		//throw UiError( lib_base.BuildUiParamEntry( UiText.errors.upper_division_for_xxx_of_type_xxx_not_found, GetForeignElem( divisions, divisionID ).name, request );

	return GetDivisionHeadOrDelegate( shopDivision, request );
}


function GetDivisionHeadOrDelegate( divison, request )
{
	person = get_division_head( divison, request );
	if ( person.employee_state_id == '' )
		return person;

	person = GetOptDivisionPersonWithRole( divison.id, 'deputy_division_head' );
	if ( person != undefined )
		return person;

	HandleWorkflowError( 'Не найден сотрудник, замещающий руководителя подразделения "' + divison.name + '"', request );
}


function get_division_location( divison )
{
	baseDivision = ArrayOptFind( GetDivisonsChain( divison.id ), 'location_id.HasValue' );
	if ( baseDivision == undefined )
		return undefined;

	return baseDivision.location_id.ForeignElem;
}


function get_person_subordinate_persons_or_self( basePerson )
{
	if ( ! basePerson.division_id.HasValue )
		return [basePerson];

	divisonIDsArray = [];

	if ( basePerson.is_division_head )
	{
		divisonIDsArray1 = ArrayExtract( XQuery( 'for $elem in divisions where IsHierChildOrSelf( $elem/id, ' + XQueryLiteral( basePerson.division_id ) + ' ) order by $elem/Hier() return $elem' ), 'id' );
		divisonIDsArray = ArrayUnion( divisonIDsArray, divisonIDsArray1 );
	}

	divisonIDsArray2 = ArrayExtract( XQuery( 'for $elem in person_struct_roles where $elem/person_id = ' + XQueryLiteral( basePerson.id ) + ' and $elem/type_id = ' + XQueryLiteral( 'division_head' ) + ' return $elem' ), 'division_id' );
	divisonIDsArray = ArrayUnion( divisonIDsArray, divisonIDsArray2 );

	if ( divisonIDsArray.length == 0 )
		return [basePerson];

	divisonIDsArray = ArraySelectDistinct( divisonIDsArray );

	personsArray = XQuery( 'for $elem in persons where MatchSome( $elem/division_id, (' + ArrayMerge( divisonIDsArray, 'XQueryLiteral( This )', ',' ) + ') ) and $elem/is_active = true() return $elem' );
	return personsArray;
}


function GetTopDivison( origDivision )
{
	array = GetDivisonsChain( origDivision.id );
	if ( array.length == 0 )
		return undefined;

	return array[array.length - 1];
}


function GetDivisonsChain( origDivisionID )
{
	array = lib_base.get_hier_chain( divisions, origDivisionID );
	if ( array.length == 0 )
		return array;

	topDivision = array[array.length - 1];
	if ( StrBegins( topDivision.name, 'ООО ' ) )
		array = ArrayRange( array, 0, array.length - 1 );

	return array;
}



