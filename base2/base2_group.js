function OnBeforeSave()
{
	if ( AppModuleUsed( 'rcr' ) )
		is_user_group = true;
}


function matches_division( divisionID )
{
	divisionsArray = lib_base.get_hier_chain( divisions, divisionID );

	for ( division in divisionsArray )
	{
		if ( matches_explicit_division( division.id ) )
			return true;
	}

	return false;
}


function matches_explicit_division( divisionID )
{
	return ( root_division_id == divisionID || base_divisions.GetOptChildByKey( divisionID ) != undefined );
}


function handle_select_base_divisions()
{
	for ( divisionID in lib_base.select_objects_from_view( 'divisions' ) )
	{
		if ( base_divisions.GetOptChildByKey( divisionID ) != undefined )
			continue;

		if ( ArrayCount( ArrayIntersect( base_divisions, lib_base.get_hier_chain( divisions, divisionID ), 'division_id', 'id' ) ) != 0 )
		{
			lib_base.show_warning_message( ActiveScreen, StrReplaceOne( UiText.messages.division_xxx_already_in_base_divisions, '%s', GetForeignElem( divisions, divisionID ).name ) );
			continue;
		}

		base_divisions.AddChild().division_id = divisionID;
		Doc.SetChanged( true );
	}
}


function handle_select_member_groups()
{
	for ( groupID in lib_base.select_objects_from_view( 'groups' ) )
	{
		if ( member_groups.GetOptChildByKey( groupID ) != undefined )
			continue;

		subGroup = GetForeignElem( groups, groupID );
		
		if ( ArrayOptFindByKey( subGroup.get_implicit_groups_array(), id, 'id' ) != undefined )
		{
			lib_base.show_warning_message( ActiveScreen, StrReplaceOne( UiText.messages.group_xxx_includes_this_group, '%s', subGroup.name ) );
			continue;
		}

		member_groups.AddChild().group_id = groupID;
		Doc.SetChanged( true );
	}
}


function get_implicit_groups_array()
{
	destArray = new Array();
	load_implicit_groups_core( destArray, 0 );

	if ( true )
	{
		innerGroupsArray = XQuery( 'for $elem in groups where IsHierChild( $elem/id, ' + XQueryLiteral( this.id ) + ' ) order by $elem/Hier() return $elem' );
		destArray = ArrayUnion( destArray, innerGroupsArray );
	}

	return destArray;
}


function load_implicit_groups_core( destArray, level )
{
	if ( level >= 16 )
		return;

	destArray.push( this );

	for ( memberGroup in member_groups )
	{
		subGroup = memberGroup.group_id.OptForeignElem;
		if ( subGroup == undefined )
			continue;

		subGroup.load_implicit_groups_core( destArray, level + 1 );
	}
}


function select_member()
{
	personID = lib_base.select_object_from_view( 'persons', {is_own_person:true} );

	members.ObtainChildByValue( personID );
	Doc.UpdateValues();
}


