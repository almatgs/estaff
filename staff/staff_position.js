function OnCreate()
{
	user_id = LdsCurUserID;
	code = lib_base.obtain_new_object_code( Name );
}


function OnCheckReadAccess()
{
	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	group = LdsCurUser.main_group_id.ForeignElem;
	if ( ! group.root_division_id.HasValue && group.base_divisions.ChildNum == 0 )
		return;

	if ( userAccess.prohibit_view_other_group_positions && LdsCurUser.main_group_id.HasValue && division_id.HasValue && ! group.matches_division( division_id ) )
		Cancel();
}


function OnBeforeSave()
{
	if ( ( global_settings.require_position_types || ( global_settings.use_position_types && ! name.HasValue ) ) && type_id.HasValue )
		name = type_id.ForeignDispName;


	employeesArray = XQuery( 'for $elem in persons where $elem/position_id = ' + id + ' return $elem' );

	employee_id.Clear();
	multi_employee_id.Clear();
	sum_employment_percent = 0;

	for ( employee in employeesArray )
	{
		if ( ! employee.is_active )
			continue;

		if ( ! employee_id.HasValue )
			employee_id = employee.id;

		multi_employee_id.Add().Value = employee.id;

		if ( employee.employment_percent.HasValue )
			sum_employment_percent += employee.employment_percent;
	}

	if ( sum_employment_percent == 0 )
		sum_employment_percent.Clear();
}


function OnSave()
{
	lib_base.update_object_secondary_data( 'division', division_id );
}


function OnDelete()
{
	lib_base.update_object_secondary_data( 'division', division_id );
}


function DocDesc()
{
	name
}


function image_url()
{
	if ( is_active )
		return '//base_pict/position.ico';
	else
		return '//base_pict/position_inactive.ico';
}


