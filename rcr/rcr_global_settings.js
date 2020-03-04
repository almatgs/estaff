function set_init_dep_values()
{
	if ( is_agency )
	{
		use_own_orgs = true;
		use_customers = true;
		use_suppliers = true;
	}

	use_sec_customers = false;
	use_resellers = false;

	if ( is_agency )
	{
		use_org_events = true;
		use_org_init_users = true;
		use_person_roles = true;
	}
	else
	{
		use_own_persons = true;
		use_divisions = true;
		use_division_types = true;
	}
}


function update_dep_values()
{
	if ( is_agency )
	{
		use_customers = true;
		use_suppliers = true;
		//use_divisions = false;
		use_division_types = false;
		use_vacancy_orgs = true;
	}
	else
	{
		use_customers = false;
		use_suppliers = false;
		//use_divisions = true;
		use_vacancy_orgs = false;
	}
}


