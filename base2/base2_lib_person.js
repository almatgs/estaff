function handle_add_person_to_contact_list( personID )
{
	handle_add_persons_to_contact_list( [personID] );
}


function handle_add_persons_to_contact_list( objectIDsArray, list )
{
	contactListID = lib_base.select_object_from_catalog( 'contact_lists' );
	
	contactListDoc = ObtainUiDoc( ObjectDocUrl( 'data', 'contact_list', contactListID ) );
	contactList = contactListDoc.TopElem;

	for ( candidateID in objectIDsArray )
	{
		contactList.members.ObtainChildByKey( candidateID );
	}

	UpdateUiDoc( contactListDoc );
	UpdateScreens( '*' );
}


function RunAgentBirthdayMonthDayUpdater()
{
	array = XQuery( 'for $elem in persons where $elem/trace_birthday = true() and $elem/birthday_month_day = null() return $elem' );
	idArray = ArrayExtract( array, 'id' );

	for ( id in idArray )
	{
		personDoc = DefaultDb.OpenObjectDoc( 'person', id );
		person = personDoc.TopElem;
		if ( person.is_derived )
			continue;

		personDoc.RunActionOnSave = false;
		personDoc.WriteDocInfo = false;
		personDoc.Save();
	}
}


