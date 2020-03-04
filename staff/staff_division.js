function OnCreate()
{
	lib_base.init_new_card_object( This );
	user_id = LdsCurUserID;
}


function OnBeforeSave()
{
	if ( global_settings.use_positions )
	{
		positionsArray = XQuery( 'for $elem in positions where $elem/division_id = ' + id + ' return $elem' );

		positions_num = ArrayCount( positionsArray );
		if ( positions_num == 0 )
			positions_num.Clear();

		if ( positions_num.HasValue )
		{
			filled_positions_num = ArrayCount( ArraySelect( positionsArray, 'employee_id.HasValue' ) );
			free_positions_num = ArrayCount( ArraySelect( positionsArray, '! employee_id.HasValue' ) );
			partially_filled_positions_num = ArrayCount( ArraySelect( positionsArray, 'employee_id.HasValue && sum_employment_percent.HasValue && sum_employment_percent < 100' ) );
		}
		else
		{
			filled_positions_num.Clear();
			free_positions_num.Clear();
			partially_filled_positions_num.Clear();
		}
	}
	else
	{
		positions_num.Clear();
		filled_positions_num.Clear();
		free_positions_num.Clear();
		partially_filled_positions_num.Clear();
	}
}


function image_url()
{
	if ( is_org )
		return ( is_active ? '//base_pict/org.ico' : '//base_pict/org_inactive.ico' );

	return is_active ? '//base_pict/division.ico' : '//base_pict/division_inactive.ico';
}


function OnParentSelected()
{
	if ( global_settings.use_division_orgs && this.parent_id.HasValue )
		this.org_id = lib_struct.GetDivisionExplicitOrgID( this.parent_id );
}


function OnOrgSelected()
{
	if ( ! this.org_id.HasValue )
		return;

	this.parent_id = lib_struct.ObtainOrgBridgeDivision( this.org_id );
}


function has_duplicates()
{
	if ( name == '' )
		return false;

	array = XQuery( 'for $elem in divisions where $elem/name = ' + name.XQueryLiteral + ' and $elem/parent_id = ' + parent_id.XQueryLiteral + ' return $elem' );
				
	return ( ArrayOptFind( array, 'id != ' + id ) != undefined );
}


function get_implicit_location_id()
{
	curDivision = this;
	level = 0;

	while ( true )
	{
		if ( curDivision.location_id.HasValue )
			return curDivision.location_id;

		curDivision = curDivision.parent_id.OptForeignElem;
		if ( curDivision == undefined )
			break;

		level++;
		if ( level > 16 )
			break;
	}

	return '';
}