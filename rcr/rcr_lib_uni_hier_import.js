// Универсальный считыватель иерерхических структур из файлов типа *.xls, *.csv
// данные для считывания в файле должны быть расположены, например, в следующием порядке:
// ----------столбец 1 ---------- столбец2 ----------- столбец3---------------
// строка1 	Уровень1.Название1	Уровень2.Название21	Уровень3.Название31
// строка2   										Уровень3.Название32
// строка3	Уровень1.Название2  Уровень2.Название22
// строка4						Уровень2.Название23
// ----------------------------------------------------------------------------
// Информация из файла загружается в справочник специальности (professions).

// Программа удаляет из справочника специальностей все стандартные элементы (у которых: <is_std>1</is_std>)

// Если у стандартных элементов (у которых: <is_std>1</is_std>) есть пользовательские дочерние элементы, то 
// пользовательские элементы сохраняются, но поднимаются на требуемое количество  уровеней вверх.

// Если название уже существующего в базе иерархического элемента совпадает с названием загружаемого, то:
// следует НЕ создавать новый элемент, импортировать дочерние элементы.

// Программа (Агент) запрашивает пользователя:
// Какой файл с иерархической структурой будет загружаен (выбор файла).



function uni_hier_import()
{
	cL = new Array(); //строка из EXCEL-файла
	aL = new Array(); //цепочка объектов из справочника профессий 
	row_length = 0; // длинна строки из EXCEL-файла
	small_array = new Array(); //маленкий массив профессий для загрузки элементов в базу
	elemID = 1; //id для нового элемента
	is_in_base = false; //Новой профессии в старой базе не обнаружено
	is_parent_open = false; //Родительский элемент для вновь создаваемого элемента еще не открыт
	coincidence = 0; //Количество совпадений между плотной строкой из EXCEL-файла и цепочкой профессий из базы
	row_current_number = 0; //Количество непустых ячеек в строке из EXCEL-файла
	deleted_array = new Array(); // массив удаленных стандартных профессий
	
	//загрузка файла=========================== 
	LogEvent('', 'Начало загрузки');
	file_url = ActiveScreen.AskFileOpen();
	if ( file_url == '' ) //проверяем наличие url  файла для загрузки
		throw UserError( UiText.errors.unable_to_open_file );
	LogEvent('', 'Проверка на наличие файла для импорта - пройдена. file_url = ' + file_url);
	
	srcDoc = OpenDoc( file_url, 'format=excel' );
	LogEvent('', 'Файл для импорта открыт');
	//загрузка профессий ПЕРВИЧНАЯ =========================================
	query = 'for $elem in professions where $elem/id != null()';
	query += ' return $elem';
	array = XQuery(query);
	LogEvent( '', query );
	array = ArraySort( array, 'name', '+'); //массив профессий
	LogEvent('', 'Массив профессий загружен из базы данных E-Staff - ПЕРВОНАЧАЛЬНЫЙ');
	//==========================================
	
	
	for (profession in array) //====удаление элементов <is_std>1</is_std>
	{
		//profession_for_delete = OpenDoc(ObjectDocUrl('data','profession', profession.id)).TopElem;
		profession_for_delete_url = ObjectDocUrl('data','profession', profession.id);
		if (profession.is_std == true)
		{
			deleted_array.push(profession);
			DeleteDoc(profession_for_delete_url);
		}
	}
	
	for (profession in array)
	{
		if (profession.parent_id.HasValue == true)
		{
			for (deleted_profession in deleted_array)
			{
				if ((profession.parent_id == deleted_profession.id)&&(profession.is_std == false))
				{
				//	profDoc_for_delete_parent = OpenDoc(ObjectDocUrl('data','profession', profession.id)).TopElem;
					profDoc_for_delete_parent = DefaultDb.OpenObjectDoc( 'profession', profession.id );
					profDoc_for_delete_parent.TopElem.parent_id = '';
					profDoc_for_delete_parent.Save();
				}
			}
		}
	}
	//загрузка профессий ПОВТОРНАЯ =========================================
	query = 'for $elem in professions where $elem/id != null()';
	query += ' return $elem';
	array = XQuery(query);
	LogEvent( '', query );
	array = ArraySort( array, 'name', '+'); //массив профессий
	LogEvent('', 'Массив профессий загружен из базы данных E-Staff - ПОВТОРНО');
	//==========================================
	
	//перебираем все строки в открытом EXCEL-файле, вычисляем максимальную длинну строки
	for ( row in srcDoc.TopElem[0] )  { if (row_length < ArrayCount(row)) { row_length = ArrayCount(row); } }
	LogEvent('', 'Найдена строка EXCEL максимальной длинны, равной ' + row_length);
	
	for ( i = 0; i<=(row_length-1); i++)  { cL[i]=''; aL[i]=0; }//Обнуляем элементы массивов
	for ( row in srcDoc.TopElem[0] ) //Введение профессий первого уровня иерерахии: перебираем все строки в открытом EXCEL-файле================
	{
		row_current_number = 0;
		for ( i = 0; i<=(row_length-1); i++) //формируем сплошную строку на основании данных EXCEL-файла
		{
			if ((row[i] != '')&&(cL[i]==''))  { cL[i]=row[i]; }
			if ((row[i] != '')&&(cL[i] !='')) { cL[i]=row[i]; }
			if  (row[i] != '') {row_current_number++;}
		}
		
		if ((row_current_number>0)&&(cL[0] != '')&&(row[0] != '' )) //если текущая строка EXCEL-файла не пустая
		{	
			is_in_base = false;
			for ( profession in array ) //обходим массив профессий, выгруженных из базы данных E-Staff
			{
			//	if (profession.id >= elemID) { elemID = profession.id + 1; }//поиск последнего id	
				if (( profession.parent_id.HasValue == false)&&(profession.name == cL[0])) { is_in_base = true; }
			} 
		
			if (is_in_base == false) //если профессии из строки EXCEL-файла в базе не найдено - создаем профессию первого уровня иерархии
			{
				elemID = lib_voc.obtain_next_voc_elem_id( professions );
				subDoc = DefaultDb.OpenNewObjectDoc( 'profession', elemID );
			//	elemID = elemID + 1;
				subDoc.TopElem.order_index = lib_voc.obtain_next_voc_elem_order_index( professions );
				subDoc.TopElem.name =  row[0];
				small_array.push(subDoc.TopElem); //добавили профессию в маленький массив
				subDoc.Save();
			}
		}	
	}// все строки в открытом EXCEL-файле перебрали
	
	for (new_profession in small_array) { LogEvent('', 'Новая специальность 1 уровня: ' + new_profession.name); }
	if (small_array.length > 0)
	{
		array = ArrayUnion(array, small_array); //Объединяем массивы
		salo = small_array.length;
		small_array.splice( 0, salo ); //Очищаем маленький массив
		LogEvent('', 'Завершен 1 цикл. Количество добавленных специальностей 1 уровня: ' + salo);
	}
	else
	{
		LogEvent('', 'Завершен 1 цикл. Количество добавленных специальностей 1 уровня: 0 ');
	}
	LogEvent('', 'Длинна массива (small_array.length) после очистки: ' + small_array.length);
	//===============================================================================================================================
	
	for ( w = 1; w<=(row_length-1); w++) // w - номер столбца в EXCEL-файле(нумерация начинается с нуля).=====================================
	{									 // Введение профессий остальных (кроме первого) уровней иерархии
		w1 = w + 1;
		LogEvent('', 'Начали цикл  w = ' + w);
		for ( i = 0; i<=(row_length-1); i++)  { cL[i]=''; aL[i]=0; }//Обнуляем элементы массивов
		//LogEvent('', 'Провели обнуление массивов cL[i] и aL[i]');
		for ( row in srcDoc.TopElem[0] ) //перебираем все строки в открытом excel========================================================
		{
			//LogEvent('', 'Формируем строку cL[0]..cL[' + (row_length-1) + ']');
			row_current_number = 0;
			for ( i = 0; i<=(row_length-1); i++) //формируем текущую строку
			{
				if ((row[i] != '')&&(cL[i]==''))  { cL[i]=row[i]; }
				if ((row[i] != '')&&(cL[i] !='')) { cL[i]=row[i]; }
				if  (row[i] != '') {row_current_number++;}
				//LogEvent('', 'cL[' + i + ']= '+ cL[i]);
			}
			if ((row_current_number>0)&&(cL[w] != '')&&(row[w] != '' )) //если текущая строка EXCEL-файла не пустая И рассматриваемый элемент строки не пустой
			{	
			//	LogEvent('', ' текущая строка cL[0] = ' + cL[0] + ' cL[1] = ' + cL[1]);
				
				is_in_base = false;
				is_parent_open = false;
				
			//	if (cL[w] !='')
			//	{	
					for ( profession in array ) //обходим массив профессий, выгруженных из базы данных E-Staff
					{
					//	if (profession.id >= elemID) { elemID = profession.id + 1; }//поиск последнего id
						
						
						//LogEvent('', 'Длина цепочки (w + 1) = ' + w1 );				
						//LogEvent('', 'строим цепочку aL[w], aL[w-1]...aL[0] из текущей профессии и вышестоящих, но не всех, а чтобы была цепчка длинной w+1');
						for (x = w; x>=0; x = x - 1) 	//строим цепочку aL[w], aL[w-1]...aL[0] из текущей профессии и вышестоящих, но не всех, а чтобы была цепчка длинной w+1
						{						//т.е. такой же длинны, как исследуемая часть сторки EXCEL-файла	
							if (x == w) {aL[x] = profession;}
							
							if (x < w)
							{
								if (aL[x+1] != 0)
								{
									if (aL[x+1].parent_id.HasValue == true)
									{
									//	alert ('!!!!!!!!!!!!!!!!!!!!!!');
									//	LogEvent('', 'aL[x+1].id = ' + aL[x+1].id + ' aL[x+1].parent_id = ' + aL[x+1].parent_id);
										aL[x] = OpenDoc(ObjectDocUrl('data','profession', aL[x+1].parent_id)).TopElem;
									}
									else
									{
										aL[x] = 0;
									}
								}
								else
								{
									aL[x] = 0;
								}
							}
							//LogEvent('', 'aL[' + x + ']= ' + aL[x]); //  0,  1
						} //======построили цепочку из текущей профессии и вышестоящих=================================
						
					/*	if ((aL[0] != 0)&&(aL[1] != 0))
						{
						//	LogEvent('', ' текущая цепочка aL[0] = ' + aL[0].name + ' aL[1] = ' + aL[1].name );
						}
						
						if ((aL[0] != 0)&&(aL[1] == 0))
						{
						//	LogEvent('', ' текущая цепочка aL[0] = ' + aL[0].name + ' aL[1] = ' + aL[1]);	
						}
						
						if ((aL[0] == 0)&&(aL[1] != 0))
						{
						//	LogEvent('', ' текущая цепочка aL[0] = ' + aL[0] + ' aL[1] = ' + aL[1].name);	
						}
						
						if ((aL[0] == 0)&&(aL[1] == 0))
						{
						//	LogEvent('', ' текущая цепочка aL[0] = ' + aL[0] + ' aL[1] = ' + aL[1]);	
						} */
						
						//LogEvent('', 'Сравниваем цепочку из текущей профессии и вышестоящих с текущей строкой');
						coincidence_all = 0;//=============================================================================
						coincidence_short = 0;
						for (y = w; y>=0; y= (y - 1)) //Сравниваем цепочку из текущей профессии и вышестоящих с текущей строкой 
						{
						//	LogEvent('', 'aL[' + y + ']= ' + aL[y]);
							
							if (aL[y] != 0) 
							{ 
								//LogEvent('', 'y = ' + y + ' aL[y].name = ' + aL[y].name + ' cL[y] = ' + cL[y] );
								if (aL[y].name == cL[y]) {coincidence_all++;} 
							}
							
							if ((aL[y] !=0) && (y>0))
							{
								if (aL[y].name == cL[y-1]) {coincidence_short++;}
							}
						}
					//	LogEvent('', 'coincidence_all = ' + coincidence_all +  'coincidence_short = ' + coincidence_short);

						
						if (coincidence_all == (w+1) ) //если совпали все
						{
					//		LogEvent('', ' ку-ку - 1 !!!!!!!!!!!!!!!!!!! ');
							if (aL[0].parent_id.HasValue == false) //и вехний конец цепочки - это верхний уровень (без родителя)
							{
								is_in_base = true; //тогда - точно такая профессия уже есть в массиве
							}
						}
						
						if (coincidence_short == w ) //если совпли все, кроме одного - самого верхнего (aL[0])
						{
					//		LogEvent('', ' ку-ку - 2 !!!!!!!!!!!!!!!!!!! ');
							if (aL[1].parent_id.HasValue == false)
							{
								parent = aL[w];
								is_parent_open = true;
							}
						}//=======================================================================================================
					} // обошли массив профессий из базы данных ==========================
					
					if ((is_in_base == false)&&(is_parent_open == true)) //пополнение маленького массива профессий 
					{
						elemID = lib_voc.obtain_next_voc_elem_id( professions );
						subDoc = DefaultDb.OpenNewObjectDoc( 'profession', elemID );
					//	elemID = elemID + 1;
						subDoc.TopElem.order_index = lib_voc.obtain_next_voc_elem_order_index( professions );
						subDoc.TopElem.name =  row[w];
						subDoc.TopElem.parent_id = parent.id
						small_array.push(subDoc.TopElem); //добавили профессию в маленький массив
						subDoc.Save();
					}		
			//	}	
			}	//к.ц. если теущая строка EXCEL-файле не пустая
		} //перебрали все сторки в открытом EXCEL-файле =================
		
		for ( new_profession in small_array )
		{
			LogEvent('', 'Новая специальность ' + w1 + ' уровня: ' + new_profession.name);
		}
		
		if ( small_array.length > 0 )
		{
			array = ArrayUnion( array, small_array ); //Объединяем массивы
			salo = small_array.length;
			small_array.splice( 0, salo ); //Очищаем маленький массив
			LogEvent('', 'Завершен ' + w1 + ' цикл. Количество добавленных специальностей' + w1 + 'уровня: ' + salo);
		}
		else
		{
			LogEvent('', 'Завершен ' + w1 + ' цикл. Количество добавленных специальностей ' + w1 + 'уровня: 0');
		}
		//LogEvent('','!!!!!!!!!!!!!!!!!!!!!!!!');
		LogEvent('', 'Длинна массива (small_array.length) после очистки: ' + small_array.length);
	}	
}
